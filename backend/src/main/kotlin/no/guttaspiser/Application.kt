package no.guttaspiser

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing

fun main() {
    val config = Config.fromEnv()
    embeddedServer(Netty, port = config.port) {
        module(SupabaseReviewRepository(config.supabaseUrl, config.supabaseKey))
    }.start(wait = true)
}

fun Application.module(repository: ReviewRepository) {
    install(ContentNegotiation) { json() }

    // Ingen CORS: frontenden når backenden på samme domene (Vite-proxy lokalt, Vercel-rewrite i prod)

    install(StatusPages) {
        exception<BadRequestException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to (cause.message ?: "Ugyldig request")))
        }
        exception<IllegalArgumentException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to (cause.message ?: "Ugyldig request")))
        }
        exception<Throwable> { call, cause ->
            call.application.environment.log.error("Uventet feil", cause)
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Noe gikk galt"))
        }
    }

    routing {
        // Alt ligger under /api, slik at Vercel kan rute /api/* hit og resten til frontenden
        route("/api") {
            get("/health") { call.respond(mapOf("status" to "ok")) }

            get("/reviews") {
                call.respond(repository.list())
            }

            post("/reviews") {
                val request = call.receive<ReviewRequest>()
                request.validate()
                val saved = repository.save(request)
                call.respond(HttpStatusCode.Created, saved)
            }

            delete("/reviews/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: throw IllegalArgumentException("id må være et tall")
                if (repository.delete(id)) {
                    call.respond(HttpStatusCode.NoContent)
                } else {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Fant ikke review $id"))
                }
            }
        }
    }
}
