from django.db import models
from pgvector.django import VectorField


# Create your models here.
class DocumentChunk(models.Model):
    text = models.TextField()
    embedding = VectorField(dimensions=384)  # Adjust dimension based on embedding model

    def __str__(self):
        return self.text[:50]  # Show a preview of the chunk