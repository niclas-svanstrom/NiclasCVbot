from openai import OpenAI
import os


client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')
)

def get_embedding(query):
    response = client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    embedding_vector = response.data[0].embedding
    return embedding_vector