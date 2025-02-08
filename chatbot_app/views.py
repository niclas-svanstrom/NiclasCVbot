from django.http import StreamingHttpResponse
from django.shortcuts import render
from pgvector.django import L2Distance
from .models import DocumentChunk
import time
from .utils import get_embedding

# Load the model once at startup

def chat_page(request):
    """Render the chat page."""
    return render(request, "chatbot_app/chat.html")

def search_documents(query, top_k=5):
    """Search stored embeddings for the closest matches to the query."""
    query_embedding = get_embedding(query)
    # Order by similarity (using L2 distance)
    results = DocumentChunk.objects.order_by(
        L2Distance('embedding', query_embedding[0])
    )[:top_k]
    return results

def stream_response(user_input):
    """Stream responses using SSE."""
    closest_chunks = search_documents(user_input)
    for chunk in closest_chunks:
        print(chunk.text)
        # Yield each chunk as an SSE message. A small delay helps simulate streaming.
        yield f"data: {chunk.text}\n\n"
    # Send a final event to signal completion.
    yield "data: [DONE]\n\n"

def chat_with_resume(request):
    """SSE endpoint that streams responses for a given query."""
    user_input = request.GET.get("query", "")
    return StreamingHttpResponse(
        stream_response(user_input),
        content_type="text/event-stream"
    )