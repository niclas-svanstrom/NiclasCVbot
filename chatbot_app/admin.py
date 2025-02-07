from django.contrib import admin
from django import forms
from django.shortcuts import render
from django.urls import path
from .utils import extract_text_from_pdf, embed_text
from .models import DocumentChunk

class PDFUploadForm(forms.Form):
    pdf_file = forms.FileField()

class PDFAdmin(admin.ModelAdmin):
    change_list_template = "admin/pdf_upload.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("upload-pdf/", self.admin_site.admin_view(self.upload_pdf), name="upload_pdf"),
        ]
        return custom_urls + urls

    def upload_pdf(self, request):
        if request.method == "POST":
            form = PDFUploadForm(request.POST, request.FILES)
            if form.is_valid():
                pdf_file = request.FILES["pdf_file"]

                # Process PDF
                chunks = extract_text_from_pdf(pdf_file)
                embeddings = embed_text(chunks)

                # Store embeddings
                for text, embedding in zip(chunks, embeddings):
                    DocumentChunk.objects.create(text=text, embedding=embedding)

                self.message_user(request, "PDF processed successfully!")
                return render(request, "admin/pdf_success.html")

        else:
            form = PDFUploadForm()
        return render(request, "admin/pdf_upload.html", {"form": form})

admin.site.register(DocumentChunk, PDFAdmin)
