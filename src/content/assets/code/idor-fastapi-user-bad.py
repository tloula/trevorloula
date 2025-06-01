@router.get("/users/{id_}", response_model=UserPublic)
async def me(db: DBSession, id_: uuid.UUID):
    return await db.get(User, id_)
