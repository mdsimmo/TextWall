package com.mdsimmo.textwall

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class TextWallApplication

fun main(args: Array<String>) {
    runApplication<TextWallApplication>(*args)
}