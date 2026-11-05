"""
One-shot admin seeder.
Run once after first boot to create the default admin account:

    python seed_admin.py

Override defaults via env vars:
    ADMIN_EMAIL=admin@college.edu
    ADMIN_PASSWORD=Admin1234
    ADMIN_NAME="Admin User"
"""
import asyncio
import os

from sqlalchemy import select


async def main():
    from app.core.config import get_settings
    from app.core.security import hash_password
    from app.models.database import init_db, AsyncSessionLocal, User

    settings = get_settings()

    admin_email = os.getenv("ADMIN_EMAIL", "admin@college.edu")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin1234")
    admin_name = os.getenv("ADMIN_NAME", "Admin User")

    await init_db()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        if result.scalar_one_or_none():
            print(f"ℹ️  Admin already exists: {admin_email}")
            return

        admin = User(
            name=admin_name,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            role="admin",
        )
        db.add(admin)
        await db.commit()
        print(f"✅ Admin created: {admin_email} / {admin_password}")


if __name__ == "__main__":
    asyncio.run(main())
