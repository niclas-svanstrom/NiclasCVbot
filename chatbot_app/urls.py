from django.urls import path
from chatbot_app.views import chat_with_resume, chat_page 

urlpatterns = [
    path("", chat_page, name="chat_page"),
    path("chat/", chat_with_resume, name="chat_with_resume"),
]
