from django.db import models
from pgvector.django import VectorField


class Document(models.Model):
    file = models.FileField(upload_to='documents/')
    
    def __str__(self):
        return str(self.file)

# Create your models here.
class DocumentChunk(models.Model):
    text = models.TextField()
    embedding = VectorField(dimensions=384)  
    def __str__(self):
        return self.text[:50] 