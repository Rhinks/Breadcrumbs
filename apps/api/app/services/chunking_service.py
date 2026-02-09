"""
Chunking service — groups messages into semantic chunks for embedding.

TODO: ML teammate will implement the actual chunking strategy.
"""

from app.services.supabase_service import get_supabase


async def create_chunks(
    conversation_id: str,
    messages: list[dict],
) -> list[dict]:
    """
    Create chunks from messages and store them in the database.
    
    Args:
        conversation_id: UUID of the conversation
        messages: List of message dicts with 'id', 'content', 'role', 'position'
    
    Returns:
        List of created chunk records
    
    TODO: ML teammate will implement chunking strategy:
    - Fixed window (every N messages)
    - Sliding window with overlap  
    - Semantic chunking (by topic change)
    """
    if not messages:
        return []
    
    supabase = get_supabase()
    
    # === STUB: Simple chunking - group all messages into one chunk ===
    # TODO: Replace with proper chunking logic
    
    chunk_content = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}" 
        for msg in messages
    ])
    
    message_ids = [msg["id"] for msg in messages]
    
    chunk_data = {
        "conversation_id": conversation_id,
        "chunk_index": 0,
        "message_ids": message_ids,
        "content": chunk_content,
        "start_message": 0,
        "end_message": len(messages) - 1,
        "embedding": None,  # Will be filled by generate_embeddings
    }
    
    result = supabase.table("conversation_chunks").insert(chunk_data).execute()
    
    return result.data
