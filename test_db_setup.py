import asyncio

from services.database_manager.database import Base, engine

# import all your models so they register with Base.metadata


async def main():
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)
	print('Tables created.')


async def check_pragma():
	async with engine.connect() as conn:
		result = await conn.exec_driver_sql('PRAGMA foreign_keys')
		print('foreign_keys =', result.scalar())


if __name__ == '__main__':
	asyncio.run(main())
	asyncio.run(check_pragma())
