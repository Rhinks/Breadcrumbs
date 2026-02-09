"""
Conversation import and processing routes.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ConversationImport, ConversationResponse
from app.services.supabase_service import get_supabase
from app.services.chunking_service import create_chunks
from app.services.embedding_service import generate_embeddings

router = APIRouter()


@router.post("/import", response_model=ConversationResponse)
async def import_conversation(payload: ConversationImport):
    """
    Import a conversation (from extension scrape or manual paste).
    
    Pipeline:
    1. Store conversation + messages in Supabase
    2. Create chunks from messages
    3. Generate embeddings for chunks
    """
    supabase = get_supabase()

    try:
        # 1. Create conversation record
        conv_data = {
            "title": payload.title,
            "source": payload.source.value,
            "source_url": payload.source_url,
            "user_id": payload.user_id,
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
        
        # Prepare messages with IDs for chunking
        messages_with_ids = [
            {
                "id": msg_result.data[i]["id"],
                "role": messages_data[i]["role"],
                "content": messages_data[i]["content"],
                "position": messages_data[i]["position"],
            }
            for i in range(len(messages_data))
        ]

        # 3. Create chunks from messages
        chunks = await create_chunks(conversation_id, messages_with_ids)

        # 4. Generate embeddings for chunks
        await generate_embeddings(chunks)

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


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a single conversation with its messages."""
    supabase = get_supabase()
    
    try:
        conv = supabase.table("conversations").select("*").eq("id", conversation_id).single().execute()
        msgs = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("position").execute()
        
        return {
            "conversation": conv.data,
            "messages": msgs.data,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Conversation not found: {str(e)}")


@router.get("/")
async def list_conversations(limit: int = 20, offset: int = 0):
    """List all conversations (paginated)."""
    supabase = get_supabase()
    
    result = supabase.table("conversations").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    return {"conversations": result.data, "count": len(result.data)}
