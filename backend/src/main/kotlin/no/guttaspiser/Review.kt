package no.guttaspiser

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReviewRequest(
    val sted: String,
    val navn: String,
    val kommentar: String? = null,
    /** Plassering i personens liste, 0 = best. */
    val rank: Int,
) {
    fun validate() {
        require(sted.isNotBlank()) { "sted kan ikke være tom" }
        require(navn.isNotBlank()) { "navn kan ikke være tom" }
        require(rank >= 0) { "rank kan ikke være negativ" }
        require(sted.length <= 200 && navn.length <= 100) { "sted/navn er for lang" }
        require((kommentar?.length ?: 0) <= 2000) { "kommentar er for lang" }
    }
}

@Serializable
data class Review(
    val id: Long,
    val sted: String,
    val navn: String,
    val kommentar: String? = null,
    val rank: Int,
    @SerialName("created_at") val createdAt: String,
)
