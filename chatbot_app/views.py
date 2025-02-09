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
        L2Distance('embedding', query_embedding)
    )[:top_k]
    return results

def stream_response(user_input):
    """Stream responses using SSE."""
    # closest_chunks = search_documents(user_input)
    streaming_chunks = ['Hello', ' I', ' am', ' Niclas', ' CV', ' AI', ' Chatbot', ' how', ' can', ' I', ' help', 'you?']
    for chunk in streaming_chunks:
        yield f"data: {chunk}\n\n"
        time.sleep(0.3)
    # for chunk in closest_chunks:
    #     yield f"data: {chunk.text}\n\n"
    yield "data: [DONE]\n\n"

def chat_with_resume(request):
    """SSE endpoint that streams responses for a given query."""
    user_input = request.GET.get("query", "")
    return StreamingHttpResponse(
        stream_response(user_input),
        content_type="text/event-stream"
    )