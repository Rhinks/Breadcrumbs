"""
Conversation import and processing routes.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ConversationImport, ConversationResponse
from app.services.embedding_service import generate_embeddings
from app.services.supabase_service import get_supabase

router = APIRouter()


@router.post("/import", response_model=ConversationResponse)
async def import_conversation(payload: ConversationImport):
    """
    Import a conversation (from extension scrape or manual paste).
    
    1. Store conversation + messages in Supabase
    2. Generate embeddings for each message
    3. Store embeddings in pgvector
    """
    supabase = get_supabase()

    try:
        # 1. Create conversation record
        conv_data = {
            "title": payload.title,
            "source": payload.source.value,
            "source_url": payload.source_url,
            "project_id": payload.project_id,
            "metadata": payload.metadata or {},
        }

        conv_result = supabase.table("conversations").insert(conv_data).execute()
        conversation_id = conv_result.data[0]["id"]

        # 2. Store messages
        messages_data = [
            {
                "conversation_id": conversation_id,
                "role": msg.role.value,
                "content": msg.content,
                "position": i,
                "metadata": msg.metadata or {},
            }
            for i, msg in enumerate(payload.messages)
        ]

        msg_result = supabase.table("messages").insert(messages_data).execute()

        # 3. Generate and store embeddings (async in production, sync for MVP)
        message_ids = [m["id"] for m in msg_result.data]
        contents = [msg.content for msg in payload.messages]

        await generate_embeddings(message_ids, contents, conversation_id)

        return ConversationResponse(
            id=conversation_id,
            title=payload.title,
            source=payload.source,
            message_count=len(payload.messages),
            created_at=conv_result.data[0]["created_at"],
            project_id=payload.project_id,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
