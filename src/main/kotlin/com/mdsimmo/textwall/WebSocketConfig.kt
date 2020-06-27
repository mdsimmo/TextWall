package com.mdsimmo.textwall

import org.springframework.context.annotation.Configuration
import org.springframework.http.server.ServerHttpRequest
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.server.support.DefaultHandshakeHandler
import java.security.Principal
import java.util.*
import kotlin.random.Random

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig : WebSocketMessageBrokerConfigurer {

    override fun configureMessageBroker(config: MessageBrokerRegistry) {
        config.enableSimpleBroker("/topic")
        config.setApplicationDestinationPrefixes("/app")
        config.setUserDestinationPrefix("/user")
    }

    val random = Random(Date().toInstant().nano.toLong() xor Date().time)

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/text-wall-socket")
                .setHandshakeHandler(object: DefaultHandshakeHandler() {
                    override fun determineUser(
                            request: ServerHttpRequest,
                            wsHandler: WebSocketHandler,
                            attributes: MutableMap<String, Any>
                    ): Principal? {
                        return object : Principal {
                            val token = "tkn" + random.nextLong()
                            override fun getName(): String {
                                return token
                            }

                        }
                    }
                })
                .withSockJS()
    }
}