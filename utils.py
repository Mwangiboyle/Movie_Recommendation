import pandas as pd

data = pd.read_csv('imdb_top_1000.csv')

indices = pd.Series(data.index, index = data['Series_Title']).drop_duplicates()
import joblib
with open('similarity.pkl', 'rb') as file:
    cosine_sim = joblib.load(file)


def get_recommendations(title, cosine_sim=cosine_sim):
    idx = indices[title]
    #Get the pairwise similarity scores of all movies with that movie
    sim_scores= list(enumerate(cosine_sim[idx]))
    #Sort the movies based on the similarity scores
    sim_scores = sorted(sim_scores, key=lambda X: X[1], reverse=True)
    sim_scores = sim_scores[1:6]
    movie_indices = [i[0] for i in sim_scores]
    #return the top 5 most similar movies
    movies = data['Series_Title'].iloc[movie_indices]
    id=data['index'].iloc[movie_indices]
    dict={"Movies":movies, "id": id}
    final_df=pd.DataFrame(dict)
    final_df.reset_index(drop=True,inplace=True)
    return movies