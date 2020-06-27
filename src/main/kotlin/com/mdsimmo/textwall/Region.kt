package com.mdsimmo.textwall

data class Region (val x1: Long, val y1: Long, val x2: Long, val y2: Long) {

    companion object {
        fun ofRange(pos: Pos, radius: Long) : Region {
            return Region(pos.x - radius, pos.y - radius, pos.x + radius, pos.y + radius)
        }
    }

    fun contains(pos: Pos): Boolean {
        return x1 <= pos.x && y1 <= pos.y && x2 >= pos.x && y2 >= pos.y
    }

    fun intersection(other: Region): Region {
        return Region(
                x1.coerceAtLeast(other.x1), y1.coerceAtLeast(other.y1),
                x2.coerceAtMost(other.x2), y2.coerceAtMost(other.y2)
        )
    }

}