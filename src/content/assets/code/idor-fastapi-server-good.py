@router.get("/servers/{id_}", response_model=list[ServerPublic])
async def get_servers(id_: uuid.UUID, db: DBSession, uid: UID):
  results = await session.execute(
      sqlmodel.select(Server)
      .where(Server.user_id == uid)  // <-- Super easy to forget
      .where(Server.id == id_)
  )
  return results.scalars().all()