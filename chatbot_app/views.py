# import pickle
# import openai
# from django.http import JsonResponse
# from sklearn.metrics.pairwise import cosine_similarity
# from chatbot_app.models import ResumeData

# openai.api_key = "your_openai_api_key"

# def chat_with_resume(request):
#     user_input = request.GET.get("query")
#     with open("resume_data/embeddings/resume_embeddings.pkl", "rb") as f:
#         vectorizer, embeddings = pickle.load(f)
    
#     input_embedding = vectorizer.transform([user_input])
#     similarities = cosine_similarity(input_embedding, embeddings).flatten()
#     best_match_idx = similarities.argmax()

#     matched_entry = ResumeData.objects.all()[best_match_idx]
#     response = openai.Completion.create(
#         engine="text-davinci-003",
#         prompt=f"Based on the following resume section:\n\n{matched_entry.content}\n\nAnswer this question:\n{user_input}",
#         max_tokens=150
#     )
    
#     return JsonResponse({"answer": response["choices"][0]["text"].strip()})

from django.http import StreamingHttpResponse

from django.shortcuts import render

def chat_page(request):
    """Render the chatbot landing page."""
    return render(request, "chatbot_app/chatbot.html")


def chat_with_resume(request):
    # Capture user input
    user_input = request.GET.get("query")
    print(f"User input: {user_input}")  # Logs the input on the server

    # Function to generate the streamed response
    def stream_response():
        responses = [
            "Hello, I am Niclas' CV chatbot.",
            "How can I help you today?",
        ]
        for line in responses:
            yield f"data: {line}\n\n"  # SSE format: 'data: <content>\n\n'
            import time
            time.sleep(1)  # Simulate streaming with delay

    # Create a streaming HTTP response with content type for SSE
    return StreamingHttpResponse(
        stream_response(),
        content_type="text/event-stream"
    )
