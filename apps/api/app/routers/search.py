"""
Semantic search using pgvector.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import SearchQuery, SearchResultItem
from app.services.embedding_service import get_embedding
from app.services.supabase_service import get_supabase

router = APIRouter()


@router.post("/", response_model=list[SearchResultItem])
async def semantic_search(query: SearchQuery):
    """
    Semantic search across conversations using chunk embeddings.
    
    Steps:
    1. Generate embedding for the search query
    2. Find similar chunks using pgvector (search_chunks function)
    3. Return ranked results with conversation context
    """
    try:
        # 1. Embed the query
        query_embedding = await get_embedding(query.query)

        # 2. Call Supabase RPC function for vector similarity search
        supabase = get_supabase()

        params = {
            "query_embedding": query_embedding,
            "match_count": query.limit,
            "similarity_threshold": 0.7,  # Minimum similarity score
        }

        if query.project_id:
            params["filter_project_id"] = query.project_id
        if query.source:
            params["filter_source"] = query.source.value

        result = supabase.rpc("search_chunks", params).execute()

        # 3. Format results
        return [
            SearchResultItem(
                chunk_id=r["chunk_id"],
                conversation_id=r["conversation_id"],
                conversation_title=r["conversation_title"],
                chunk_content=r["chunk_content"],
                chunk_index=r["chunk_index"],
                score=r["similarity"],
                source=r["source"],
            )
            for r in result.data
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
