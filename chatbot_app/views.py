from django.http import StreamingHttpResponse
from django.shortcuts import render
from pgvector.django import L2Distance
from .models import DocumentChunk
import time
import json
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

def stream_response(user_input, conversation):
    """Stream responses using SSE."""
    # closest_chunks = search_documents(user_input)
    streaming_chunks = ['Hello', ' I', ' am', ' Niclas', ' CV', ' AI', ' Chatbot', ' how', ' can', ' I', ' help', ' you?']
    for chunk in streaming_chunks:
        yield json.dumps({
            'role': 'assistant',
            'message': chunk
        }) + "\n"
        time.sleep(0.3)
    # for chunk in closest_chunks:
    #     yield f"data: {chunk.text}\n\n"

# def chat_with_resume(request):
#     """SSE endpoint that streams responses for a given query."""
#     user_input = request.GET.get("query", "")
#     return StreamingHttpResponse(
#         stream_response(user_input),
#         content_type="text/event-stream"
#     )




# def stream_response(user_message, conversation, selected_version):
#     print(selected_version)
#     try:
#         messages = [{"role": "system",
#                     "content": "Assistant is a large language model trained by OpenAI."}]
#         conversation = [{"role": message['role'],
#                         "content": message['text']} for message in conversation]
#         messages.extend(conversation)
#         messages.append({"role": "user", "content": user_message})

#         stream = client.chat.completions.create(
#             model="gpt-4o",
#             messages=messages,
#             stream=True
#         )
#         for chunk in stream:
#             print(chunk)
#             if chunk.choices and chunk.choices[0].delta.content is not None:
#                 assistant_message = chunk.choices[0].delta.content
#                 assistant_message = assistant_message.replace('\\\\', '\\\\\\\\')
#                 yield json.dumps({
#                     'role': 'assistant',
#                     'message': assistant_message
#                 }) + "\n"
#     except Exception as e:
#         yield json.dumps({'error': str(e)}) + "\\n"

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import MessageSerializer 

    
class ChatApiView(APIView):
    def post(self, request):
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            user_message = serializer.validated_data['message']
            conversation = serializer.validated_data['conversation']
            return StreamingHttpResponse(stream_response(user_message, conversation),
                                         content_type='application/json')
        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)
