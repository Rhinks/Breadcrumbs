from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ConversationSource(str, Enum):
    chatgpt = "chatgpt"
    claude = "claude"
    gemini = "gemini"
    manual = "manual"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class MessageSchema(BaseModel):
    role: MessageRole
    content: str
    timestamp: Optional[str] = None
    metadata: Optional[dict] = None


class ConversationImport(BaseModel):
    """Payload from extension or manual import."""
    title: str
    source: ConversationSource
    source_url: Optional[str] = None
    messages: list[MessageSchema]
    scraped_at: Optional[str] = None
    project_id: Optional[str] = None
    metadata: Optional[dict] = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    source: ConversationSource
    message_count: int
    created_at: datetime
    project_id: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    project_id: Optional[str] = None
    source: Optional[ConversationSource] = None
    limit: int = 10


class SearchResultItem(BaseModel):
    conversation_id: str
    conversation_title: str
    message_content: str
    message_role: MessageRole
    score: float
    source: ConversationSource
