from django.db import models
from pgvector.django import VectorField
import os

class Document(models.Model):
    file = models.FileField(upload_to='documents/')
    document_name = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if self.file:
            self.document_name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.document_name

class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    text = models.TextField()
    embedding = VectorField(dimensions=1536)
    
    def __str__(self):
        return self.text[:50]
