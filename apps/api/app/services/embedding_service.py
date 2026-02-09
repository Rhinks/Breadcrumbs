"""
OpenAI embedding generation service.
"""

from openai import AsyncOpenAI
from app.config import settings
from app.services.supabase_service import get_supabase

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def get_embedding(text: str) -> list[float]:
    """Generate a single embedding for a text string."""
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text,
    )
    return response.data[0].embedding


async def generate_embeddings(
    message_ids: list[str],
    contents: list[str],
    conversation_id: str,
) -> None:
    """
    Generate embeddings for a batch of messages and store in Supabase.
    
    Uses OpenAI's batch embedding endpoint for efficiency.
    """
    if not contents:
        return

    # Generate embeddings in batch (OpenAI supports up to 2048 inputs)
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=contents,
    )

    # Store embeddings in the message_embeddings table
    supabase = get_supabase()

    embedding_rows = [
        {
            "message_id": message_ids[i],
            "conversation_id": conversation_id,
            "embedding": response.data[i].embedding,
        }
        for i in range(len(message_ids))
    ]

    # Insert in batches of 100 to avoid payload limits
    batch_size = 100
    for i in range(0, len(embedding_rows), batch_size):
        batch = embedding_rows[i:i + batch_size]
        supabase.table("message_embeddings").insert(batch).execute()
