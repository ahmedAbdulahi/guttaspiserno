package no.guttaspiser

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReviewRequest(
    val sted: String,
    val navn: String,
    val stjerner: Int,
    val kommentar: String? = null,
) {
    fun validate() {
        require(sted.isNotBlank()) { "sted kan ikke være tom" }
        require(navn.isNotBlank()) { "navn kan ikke være tom" }
        require(stjerner in 1..5) { "stjerner må være mellom 1 og 5" }
        require(sted.length <= 200 && navn.length <= 100) { "sted/navn er for lang" }
        require((kommentar?.length ?: 0) <= 2000) { "kommentar er for lang" }
    }
}

@Serializable
data class Review(
    val id: Long,
    val sted: String,
    val navn: String,
    val stjerner: Int,
    val kommentar: String? = null,
    @SerialName("created_at") val createdAt: String,
)
