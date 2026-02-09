"""
Embedding management routes.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/reindex/{conversation_id}")
async def reindex_conversation(conversation_id: str):
    """Re-generate embeddings for all messages in a conversation."""
    # TODO: Implement re-indexing
    return {"status": "not_implemented", "conversation_id": conversation_id}
