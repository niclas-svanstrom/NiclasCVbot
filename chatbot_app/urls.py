from django.urls import path
from . import views


urlpatterns = [
    path("", views.chat_page, name="chat_page"),
    # path('stream/', views.chat_with_resume, name='chat_with_resume'),
    path('chat_api/', views.ChatApiView.as_view(), name='chat_api'),
]
