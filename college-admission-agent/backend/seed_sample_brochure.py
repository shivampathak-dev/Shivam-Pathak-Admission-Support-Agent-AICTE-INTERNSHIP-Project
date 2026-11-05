"""
Script to generate and ingest official sample college brochure PDF.
Indexes chunks into ChromaDB and registers the document in SQLite.
"""
import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import fitz
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select

from app.models.database import AsyncSessionLocal, IndexedDocument, User, init_db
from app.rag.ingestion import ingest_pdf, get_collection_stats

PDF_FILENAME = "College_Admission_Brochure_2025-26.pdf"
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data", "uploaded_pdfs")
PDF_PATH = os.path.join(UPLOAD_DIR, PDF_FILENAME)

PAGES_CONTENT = [
    (
        "1. IMPORTANT ADMISSION DATES & APPLICATION DEADLINES",
        """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE & PROSPECTUS (ACADEMIC YEAR 2025-2026)

1. IMPORTANT ADMISSION DATES & APPLICATION DEADLINES:
Prospective candidates are advised to take note of the following critical deadlines for admission into undergraduate (B.Tech) and postgraduate (M.Tech) programs for the 2025-2026 academic session:

- Early Decision / Phase 1 Online Application Opens: April 1, 2025
- Phase 1 Application Deadline: May 15, 2025
- Regular Round (Phase 2) Application Deadline: June 30, 2025
- Late Application Submission Deadline: July 15, 2025 (with late penalty fee of INR 2,000)
- Round 1 Merit List Announcement & Counseling: July 20, 2025
- Round 1 Fee Payment & Seat Acceptance: July 27, 2025
- Round 2 Merit List Announcement & Counseling: August 5, 2025
- Spot Admissions & Physical Document Verification: August 12, 2025
- Student Orientation Program: August 16, 2025
- Commencement of Regular Classes: August 18, 2025

Please note that no applications will be accepted after the final closing date of July 15, 2025 under any circumstances.
"""
    ),
    (
        "2. ACADEMIC PROGRAMS & ANNUAL FEE STRUCTURE",
        """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

2. ACADEMIC PROGRAMS & ANNUAL FEE STRUCTURE:
The approved annual tuition and academic fee structure for various Bachelor of Technology (B.Tech) disciplines is detailed below:

- B.Tech Computer Science & Engineering (CSE):
  * Annual Tuition Fee: INR 1,50,000
  * Laboratory & Computing Infrastructure Fee: INR 35,000
  * Total Annual Fee: INR 1,85,000 per year (Total 4-Year Course: INR 7,40,000)

- B.Tech Artificial Intelligence & Data Science (AI & DS):
  * Annual Tuition Fee: INR 1,45,000
  * Specialized AI Lab Fee: INR 35,000
  * Total Annual Fee: INR 1,80,000 per year

- B.Tech Electronics & Communication Engineering (ECE):
  * Annual Fee: INR 1,65,000 per year

- B.Tech Mechanical Engineering (ME):
  * Annual Fee: INR 1,40,000 per year

- B.Tech Civil Engineering (CE):
  * Annual Fee: INR 1,30,000 per year

Additional One-Time & Mandatory Charges:
- One-Time Admission Processing Fee: INR 5,000 (Non-refundable)
- Institutional Caution Deposit: INR 10,000 (Fully refundable upon graduation)
- Semester Examination Fee: INR 4,000 per semester
- Fees can be paid per semester (50% per semester) or annually via Net Banking, UPI, or Demand Draft.
"""
    ),
    (
        "3. ELIGIBILITY CRITERIA & ADMISSION PROCESS",
        """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

3. ELIGIBILITY CRITERIA FOR UNDERGRADUATE ADMISSIONS:
Candidates seeking admission to the 1st Year of 4-Year B.Tech degree programs must fulfill the following mandatory criteria:

- Academic Qualifications:
  * Passed 10+2 examination (Higher Secondary) from CBSE, CISCE, State Board, or recognized international boards.
  * Minimum aggregate marks of 60% in Physics, Mathematics, and Chemistry/Computer Science.
  * A relaxation of 5% is granted to candidates belonging to SC, ST, and PwD categories (minimum 55% required).

- Accepted Entrance Examinations:
  * National Level: JEE Main (Cutoff percentile varies from 85 to 95 depending on the branch).
  * State Level: State Common Entrance Test (CET) or Institutional Entrance Exam (USAT).

- Age Criteria:
  * Candidates born on or after October 1, 2000 are eligible for admission in the 2025-2026 batch.

- Mandatory Document Checklist for Verification:
  1. Class 10th Certificate and Marksheet (Date of Birth proof).
  2. Class 12th Certificate and Marksheet.
  3. JEE Main or State CET Admit Card & Scorecard.
  4. Migration Certificate and School Leaving / Transfer Certificate (TC).
  5. Category / Caste Certificate (OBC-NCL / SC / ST / EWS) if claiming reservation.
  6. Government Photo ID (Aadhaar Card / Passport).
  7. 6 recent passport-size colored photographs.
"""
    ),
    (
        "4. HOSTEL ACCOMMODATION, MESS & CAMPUS FACILITIES",
        """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

4. HOSTEL ACCOMMODATION, MESS & CAMPUS FACILITIES:
The institute provides well-maintained, secure residential accommodation for both male and female students in separate campus hostel complexes.

Hostel Accommodation Fee Structure (Per Academic Year):
- Non-AC Double Sharing Room: INR 75,000 per annum
- AC Double Sharing Room: INR 95,000 per annum
- Non-AC Triple Sharing Room: INR 60,000 per annum
- Hostel Security Deposit (Refundable): INR 5,000

Mess & Dining Charges:
- Annual Mess Fee: INR 40,000 per year.
- Serves 4 meals daily: Breakfast, Lunch, Evening Snacks, and Dinner.
- Pure vegetarian and non-vegetarian food options available in designated dining halls with hygienic modern kitchens.

Campus Amenities:
- High-Speed Wi-Fi: 1 Gbps campus-wide wireless coverage in academic blocks and hostels.
- Central Library: Over 50,000 physical volumes, IEEE/ACM digital access, and 24-hour reading rooms.
- Healthcare Centre: 24/7 on-campus dispensary staffed by residential medical officers with free basic medicines and ambulance.
- Sports Infrastructure: Football stadium, indoor badminton courts, cricket nets, basketball courts, and modern fitness gym.
"""
    ),
    (
        "5. SCHOLARSHIPS, FINANCIAL AID & CONTACT DETAILS",
        """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

5. SCHOLARSHIPS & FINANCIAL ASSISTANCE:
The institute believes no deserving student should be denied education due to financial hardship:

- Merit Scholarships:
  * JEE Main All India Rank 1 to 5,000: 100% Tuition Fee Waiver for all 4 years.
  * JEE Main All India Rank 5,001 to 15,000: 50% Tuition Fee Waiver.
  * Class 12th Board Toppers (>= 95% aggregate): 30% Tuition Fee Waiver in first year.

- Need-Based & Economically Weaker Section (EWS) Support:
  * 50% Tuition Fee waiver for candidates whose family annual income is below INR 3,00,000.
  * Assistance with government education loans through partner nationalized banks.

- Sports & Cultural Excellence:
  * 25% Fee waiver for state or national level sports medalists.

6. CONTACT DETAILS & ADMISSIONS OFFICE:
For any admission inquiries, counseling appointments, or campus visits:
- Admissions Office Email: admissions@college.edu
- General Helpdesk: info@college.edu
- Helpline Numbers: +91-11-23456789 / +91-9876543210
- National Toll-Free: 1800-123-4567
- Office Address: Admissions Block, Ground Floor, National Institute of Technology & Science Campus, Tech City.
- Operating Hours: Monday through Saturday, 9:00 AM to 5:00 PM IST.
"""
    )
]


def create_pdf():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    doc = fitz.open()
    for title, content in PAGES_CONTENT:
        page = doc.new_page(width=595, height=842)
        rect = fitz.Rect(45, 50, 550, 790)
        page.insert_textbox(rect, content, fontsize=10.5, fontname="helv")
    doc.save(PDF_PATH)
    doc.close()
    print(f"Created PDF at: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")


async def main():
    create_pdf()
    await init_db()

    print("Ingesting PDF into ChromaDB...")
    chunk_count = ingest_pdf(PDF_PATH, PDF_FILENAME)
    print(f"Indexed {chunk_count} chunks into ChromaDB.")

    async with AsyncSessionLocal() as db:
        # Check if already present
        res = await db.execute(select(IndexedDocument).where(IndexedDocument.filename == PDF_FILENAME))
        doc = res.scalar_one_or_none()
        if not doc:
            doc = IndexedDocument(
                filename=PDF_FILENAME,
                file_path=PDF_PATH,
                chunk_count=chunk_count,
                status="indexed",
                uploaded_by=1,
                indexed_at=datetime.now(timezone.utc),
            )
            db.add(doc)
        else:
            doc.chunk_count = chunk_count
            doc.status = "indexed"
            doc.indexed_at = datetime.now(timezone.utc)
        await db.commit()
        print("Updated SQLite database record.")

    stats = get_collection_stats()
    print("ChromaDB collection stats:", stats)


if __name__ == "__main__":
    asyncio.run(main())
