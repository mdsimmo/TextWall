package com.mdsimmo.textwall

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller
import java.security.Principal

@Controller
class TextController @Autowired constructor(private val mes: SimpMessagingTemplate) {

    private companion object {
        private const val MAX_SIGHT = 100L
        private const val MAX_JUMP_RANGE = 15L
    }

    val dataStore = object : DataStore {

        val cells: MutableMap<Pos, Char> = hashMapOf()
        val userPositions: HashMap<String, Pos> = hashMapOf()

        init {
            for (i in -5L..5) {
                cells[Pos(i, i)] = ('5' + i.toInt())
            }
        }

        override fun load(region: Region): String {
            val content = StringBuilder()
            for (j in region.y1 .. region.y2) {
                for (i in region.x1 .. region.x2) {
                    content.append(cells[Pos(i, j)] ?: ' ')
                }
            }
            return content.toString()
        }

        override fun write(data: Cell) {
            cells[data.pos] = data.content
        }

        override fun getUserPos(user: String): Pos {
            return userPositions[user] ?: Pos(0, 0)
        }

        override fun setUserPos(user: String, pos: Pos) {
            userPositions[user] = pos
        }

        override fun usersWithin(region: Region): Collection<String> {
            return userPositions.filterValues { region.contains(it) }.keys
        }
    }

    @MessageMapping("/update")
    fun updateCell(change: Cell, user: Principal) {
        println("Cell updated: $change")

        // Users cannot alter cells too far from themselves
        if (!Region.ofRange(change.pos, MAX_JUMP_RANGE).contains(dataStore.getUserPos(user.name))) {
            println("Update too far away")
            return
        }

        // Update the cell
        dataStore.write(change)

        // Notify nearby users
        dataStore.usersWithin(Region.ofRange(change.pos, MAX_SIGHT))
                .forEach {
                    println("Informing: $it")
                    mes.convertAndSendToUser(it, "/topic/updates", change)
                }
    }

    @MessageMapping("/move")
    @SendToUser("/topic/updates")
    fun updatePosition(pos: Pos, user: Principal): PlayerPos? {
        println("Player moved: $pos - ${user.name}")

        // Do not let the user move too far at once
        if (!Region.ofRange(dataStore.getUserPos(user.name), MAX_JUMP_RANGE).contains(pos)) {
            println("Player tried to move too far")
            return PlayerPos(dataStore.getUserPos(user.name), "you")
        }

        // Move the player
        dataStore.setUserPos(user.name, pos)
        return null
    }

    @MessageMapping("/region")
    @SendToUser("/topic/updates", broadcast = false)
    fun getData(region: Region, user: Principal): RegionData? {
        // Ensure user cannot see too far
        val pos = dataStore.getUserPos(user.name)
        val selected = Region.ofRange(pos, MAX_SIGHT).intersection(region)
        return RegionData(selected, dataStore.load(selected))
    }
}