from rest_framework import serializers

class ConversationMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    text = serializers.CharField(required=True, allow_blank=True)  # Disallow empty messages
    created_at = serializers.DateTimeField()

class MessageSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
    conversation = serializers.ListSerializer(child=ConversationMessageSerializer())