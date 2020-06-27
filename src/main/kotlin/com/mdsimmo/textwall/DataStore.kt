package com.mdsimmo.textwall

interface DataStore {
    fun load(region: Region): String
    fun write(data: Cell)

    fun getUserPos(user: String): Pos
    fun setUserPos(user: String, pos: Pos)
    fun usersWithin(region: Region): Collection<String>
}