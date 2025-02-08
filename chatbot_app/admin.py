from django.contrib import admin
from django import forms
from django.shortcuts import render
from django.urls import path
from .utils import get_embedding
from .models import Document, DocumentChunk
from PyPDF2 import PdfReader
from io import BytesIO
from django.http import HttpResponseRedirect

import time


from django import forms
from io import BytesIO
from PyPDF2 import PdfReader

class DocumentUploadForm(forms.Form):
    file = forms.FileField(required=False)  # Make the file field optional since we're passing the content directly

    def __init__(self, *args, **kwargs):
        # Override init to handle passed content instead of file input
        super().__init__(*args, **kwargs)
        if 'file' in kwargs:
            self.file_content = kwargs['file']
        else:
            self.file_content = None

class DocumentAdmin(admin.ModelAdmin):
    list_display = ('file',)

    def process_uploaded_file(self, request, queryset):
        # Process one document at a time
        document = queryset.first()  # Get the first selected document

        if not document:
            self.message_user(request, "No document selected.")
            return HttpResponseRedirect(request.get_full_path())

        file_content = document.file.read()  # Read file content

        if not file_content:
            self.message_user(request, "No content in the uploaded file.")
            return HttpResponseRedirect(request.get_full_path())

        # Process the file and create chunks
        self.process_file(file_content)

        self.message_user(request, "File processed and chunks created successfully.")
        return HttpResponseRedirect(request.get_full_path())  # Redirect to avoid reprocessing

    def process_file(self, file_content):
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
        chunks = self.split_text_into_chunks(cleaned_text, chunk_size=200, overlap=50)
        if not chunks:
            print("No chunks generated.")
        else:
            print(f"Generated {len(chunks)} chunks.")

        # Generate embeddings and save DocumentChunks
        for chunk in chunks:
            embedding = get_embedding(chunk)  # Replace with your actual embedding method
            DocumentChunk.objects.create(text=chunk, embedding=embedding)
            print(f"Saved chunk with embedding (first 50 chars): {chunk[:50]}...")

    def clean_text(self, text):
        """
        Clean the input text by replacing any sequence of whitespace (including
        newlines and multiple spaces) with a single space, and stripping any
        leading or trailing whitespace.
        """
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

    def split_text_into_chunks(self, text, chunk_size=200, overlap=50):
        """
        Split large text into smaller chunks.

        Each chunk will be `chunk_size` characters long with an overlap of `overlap`
        characters between consecutive chunks.
        """
        step = chunk_size - overlap
        return [text[i:i + chunk_size] for i in range(0, len(text), step)]

    process_uploaded_file.short_description = "Process uploaded file"

    actions = ['process_uploaded_file']


admin.site.register(Document, DocumentAdmin)
admin.site.register(DocumentChunk)  # Register DocumentChunk as well
