from django.http import StreamingHttpResponse
from django.shortcuts import render
from pgvector.django import L2Distance
from .models import DocumentChunk
import time
import json
from .utils import get_embedding
from .models import Document, DocumentChunk
from openai import OpenAI

client = OpenAI()

# Load the model once at startup

def chat_page(request):
    """Render the chat page."""
    documents = Document.objects.all()
    context = {
        'documents': documents,
    }
    return render(request, "chatbot_app/chat.html", context)

def search_documents(query, top_k=5):
    """Search stored embeddings for the closest matches to the query."""
    query_embedding = get_embedding(query)
    # chunk = DocumentChunk.objects.get(id=31)
    # query_embedding = chunk.embedding
    # Order by similarity (using L2 distance)
    results = DocumentChunk.objects.order_by(
        L2Distance('embedding', query_embedding)
    )[:top_k]
    return results

tools = [{
    "type": "function",
    "function": {
        "name": "search_documents",
        "description": "Query a knowledge base to retrieve relevant info on Niclas.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The user question or search query."
                },
            },
            "required": [
                "query",
            ],
            "additionalProperties": False
        },
        "strict": True
    }
}]

def serialize_search_results(results):
    """
    Convert your search_documents results (a list or queryset of DocumentChunk objects)
    into a JSON-serializable structure.
    """
    serialized = []
    for chunk in results:
        serialized.append({
            "document_name": chunk.document.document_name,
            "file_url": chunk.document.file.url,
            "text_snippet": chunk.text
        })
    return serialized

gpt_instruction = """You are an AI assistant that answers questions only about Niclas Svanström, using the search_documents function, which contains information about his resume, work history, projects, applications, technical skills, and professional experience.

Rules for Answering
Always use search_documents when a query relates to Niclas’s experience, skills, projects, applications, or professional background.
If a user refers to "you", interpret it as referring to Niclas.
If a user asks something about the current app or how it was built the information found in the search_documents function and name is personal cv chatbot.
If a question cannot reasonably relate to Niclas, politely state that you only provide information about him.
Handling User Queries
Base all responses on search_documents results.
Be concise and relevant. If no relevant information is found, inform the user.
Decline unrelated questions (e.g., general topics, opinions) by stating that you only provide details about Niclas Svanström."""

def stream_response(user_input, conversation):
    """
    Stream responses using SSE with support for function calls that arrive in parts.
    If a function call (e.g. search_documents) is detected, its chunks are accumulated,
    the function is called, and its output (e.g. sources list) is injected into the conversation.
    Then, the updated conversation is sent back to GPT to generate a final answer.
    """
    # Build the conversation messages in the expected format.
    messages = [{
        "role": "system",
        "content": gpt_instruction
    }]
    messages.extend([{"role": msg["role"], "content": msg["text"]} for msg in conversation])
    messages.append({"role": "user", "content": user_input})



    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
    )
    if not completion.choices[0].message.tool_calls:
        yield json.dumps({
            "role": "assistant",
            "message": completion.choices[0].message.content
        }) + "\n"
    else: 
        tool_call = completion.choices[0].message.tool_calls[0]

        args = json.loads(tool_call.function.arguments)

        result = search_documents(args["query"])
        sources = {}
        context = ""
        for chunk_obj in result:
            doc = chunk_obj.document
            sources[doc.document_name] = doc.file.url
            context += chunk_obj.text
        sources_list = [{'document_name': name, 'url': url} for name, url in sources.items()]
        messages.append(completion.choices[0].message)  # append model's function call message
        messages.append({                               # append result message
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": context
        })

        final_completion = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
        tools=tools
        )
        for chunk in final_completion:
            if chunk.choices and chunk.choices[0].delta.content is not None:
                yield json.dumps({
                    "role": "assistant",
                    "message": chunk.choices[0].delta.content
                }) + "\n"
        yield json.dumps({
            'role': 'assistant_sources',
            'sources': sources_list
        }) + "\n"


    # stream = client.chat.completions.create(
    #     model="gpt-4o",
    #     messages=messages,
    #     stream=True,
    #     tools=tools
    # )
    
    # collected_text = ""
    # final_tool_calls = {}  # To accumulate tool_calls from the stream

    # # Process each chunk from the stream.
    # for chunk in stream:
    #     delta = chunk.choices[0].delta
    #     print(chunk)
    #     for tool_call in delta.tool_calls or []:
    #         index = tool_call.index

    #         if index not in final_tool_calls:
    #             final_tool_calls[index] = tool_call

    #         final_tool_calls[index].function.arguments += tool_call.function.arguments

    #     # Process and stream regular text content.
    #     if delta.content is not None:
    #         collected_text += delta.content
    #         yield json.dumps({
    #             "role": "assistant",
    #             "message": delta.content
    #         }) + "\n"
    # print(final_tool_calls)
    # # After processing the stream, check if we have a tool call.
    # if 0 in final_tool_calls:
    #     tool_call = final_tool_calls[0]
    #     # Build an assistant message with the complete tool call details.

    #     args = json.loads(tool_call.function.arguments)

    #     result = search_documents(args["query"])
    #     sources = {}
    #     for chunk_obj in result:
    #         doc = chunk_obj.document
    #         sources[doc.document_name] = doc.file.url
    #     sources_list = [{'document_name': name, 'url': url} for name, url in sources.items()]
    #     tool_message = {
    #         "role": "tool",
    #         "tool_call_id": str(getattr(tool_call, "index", None)),
    #         "content": str(sources_list)
    #     }
    #     messages.append(tool_message)
    #     print(messages)
    #     final_completion = client.chat.completions.create(
    #         model="gpt-4o",
    #         messages=messages,
    #         stream=True,
    #         tools=tools
    #     )
    #     for chunk in final_completion:
    #         if chunk.choices and chunk.choices[0].delta.content is not None:
    #             yield json.dumps({
    #                 "role": "assistant",
    #                 "message": chunk.choices[0].delta.content
    #             }) + "\n"
    #     yield json.dumps({
    #         'role': 'assistant_sources',
    #         'sources': sources_list
    #     }) + "\n"





    # streaming_chunks = ['Hello', ' I', ' am', ' Niclas', ' CV', ' AI', ' Chatbot', ' how', ' can', ' I', ' help', ' you?']
    # for chunk in streaming_chunks:
    #     yield json.dumps({
    #         'role': 'assistant',
    #         'message': chunk
    #     }) + "\n"

    # sources = {}
    # for chunk in closest_chunks:
    #     doc = chunk.document
    #     # Use the document_name and file URL; duplicates will be merged.
    #     sources[doc.document_name] = doc.file.url

    # sources_list = [{'document_name': name, 'url': url} for name, url in sources.items()]

    # # Yield a final message with the sources list
    # yield json.dumps({
    #     'role': 'assistant_sources',
    #     'sources': sources_list
    # }) + "\n"
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
