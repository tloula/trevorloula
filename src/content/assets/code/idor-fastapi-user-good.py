@router.get("/users/me", response_model=UserPublic)
async def me(db: DBSession, uid: UID):
    return await db.get(User, uid)
