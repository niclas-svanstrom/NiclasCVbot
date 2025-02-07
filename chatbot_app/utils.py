import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def extract_text_from_pdf(pdf_file):
    """Extracts text and chunks it into smaller parts."""
    doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
    text = " ".join([page.get_text("text") for page in doc])

    # Chunk text (e.g., split every 500 characters)
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    return chunks

def embed_text(chunks):
    """Embeds text chunks using Sentence Transformers."""
    return model.encode(chunks).tolist()
