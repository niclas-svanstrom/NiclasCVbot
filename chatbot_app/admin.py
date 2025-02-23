from django.contrib import admin
from django import forms
from django.shortcuts import render
from django.urls import path
from .utils import get_embedding
from .models import Document, DocumentChunk
from PyPDF2 import PdfReader
from io import BytesIO
from django.http import HttpResponseRedirect

class DocumentUploadForm(forms.Form):
    file = forms.FileField(required=False)  # Optional file field if passing content directly

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'file' in kwargs:
            self.file_content = kwargs['file']
        else:
            self.file_content = None

class DocumentAdmin(admin.ModelAdmin):
    list_display = ('file',)

    def process_uploaded_file(self, request, queryset):
        document = queryset.first()  # Get the first selected document

        if not document:
            self.message_user(request, "No document selected.")
            return HttpResponseRedirect(request.get_full_path())

        file_content = document.file.read()  # Read file content

        if not file_content:
            self.message_user(request, "No content in the uploaded file.")
            return HttpResponseRedirect(request.get_full_path())

        # Process the file and create chunks, passing the document instance
        self.process_file(file_content, document)

        self.message_user(request, "File processed and chunks created successfully.")
        return HttpResponseRedirect(request.get_full_path())

    def process_file(self, file_content, document):
        # Extract text from the PDF
        text = self.extract_text_from_pdf(file_content)
        if not text:
            print("No text extracted from the PDF.")
        else:
            print(f"Extracted text length: {len(text)} characters")

        # Clean the text by removing newlines and extra spaces
        cleaned_text = self.clean_text(text)
        print(f"Cleaned text length: {len(cleaned_text)} characters")

        # Split text into chunks of 200 characters with a 50-character overlap
        chunks = self.split_text_into_chunks(cleaned_text, chunk_size=400, overlap=100)
        if not chunks:
            print("No chunks generated.")
        else:
            print(f"Generated {len(chunks)} chunks.")

        # Generate embeddings and save DocumentChunks with a reference to the document
        for chunk in chunks:
            embedding = get_embedding(chunk)  # Replace with your actual embedding method
            DocumentChunk.objects.create(document=document, text=chunk, embedding=embedding)
            print(f"Saved chunk with embedding (first 50 chars): {chunk[:50]}...")

    def clean_text(self, text):
        """Clean input text by replacing any sequence of whitespace with a single space."""
        return " ".join(text.split())

    def extract_text_from_pdf(self, file_content):
        """Extract text from a PDF file."""
        pdf_reader = PdfReader(BytesIO(file_content))
        full_text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text
        return full_text

    def split_text_into_chunks(self, text, chunk_size=400, overlap=100):
        """Split text into chunks of given size with specified overlap."""
        step = chunk_size - overlap
        return [text[i:i + chunk_size] for i in range(0, len(text), step)]

    process_uploaded_file.short_description = "Process uploaded file"
    actions = ['process_uploaded_file']

admin.site.register(Document, DocumentAdmin)
admin.site.register(DocumentChunk)
