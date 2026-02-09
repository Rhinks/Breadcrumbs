"""
Embedding service — generates vector embeddings for chunks.

TODO: ML teammate can swap OpenAI for Gemini or other providers.
"""

from openai import AsyncOpenAI
from app.config import settings
from app.services.supabase_service import get_supabase

# Initialize OpenAI client (will be None if no API key)
_client = None


def _get_client():
    global _client
    if _client is None and settings.openai_api_key:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def get_embedding(text: str) -> list[float]:
    """
    Generate a single embedding for text (used for search queries).
    """
    client = _get_client()
    
    if client is None:
        # Return dummy embedding for testing without API key
        return [0.0] * settings.embedding_dimensions
    
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text,
    )
    return response.data[0].embedding


async def generate_embeddings(chunks: list[dict]) -> None:
    """
    Generate embeddings for chunks and update them in the database.
    
    Args:
        chunks: List of chunk records from database (must have 'id' and 'content')
    
    TODO: ML teammate can:
    - Swap to Gemini embeddings
    - Add batching for large conversations
    - Add retry logic for API failures
    """
    if not chunks:
        return
    
    client = _get_client()
    supabase = get_supabase()
    
    for chunk in chunks:
        if client is None:
            # Dummy embedding for testing
            embedding = [0.0] * settings.embedding_dimensions
        else:
            response = await client.embeddings.create(
                model=settings.embedding_model,
                input=chunk["content"],
            )
            embedding = response.data[0].embedding
        
        # Update the chunk with its embedding
        supabase.table("conversation_chunks").update({
            "embedding": embedding
        }).eq("id", chunk["id"]).execute()
