const fetch = require('node-fetch');

const setlistRequestOptions = {
  headers: {
    Accept: 'application/json',
    'x-api-key': ''
  }
};

const spotifyRequestOptions = {
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer'
  }
};

function searchSpotify(artist = '', trackName = '') {
  return fetch(
    `https://api.spotify.com/v1/search?type=track&limit=1&q=${artist}+${trackName}`,
    spotifyRequestOptions
  );
}

function createPlaylist(name, description = '') {
  return fetch('https://api.spotify.com/v1/users/z0ne66/playlists', {
    ...spotifyRequestOptions,
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      public: false
    })
  });
}

function addTracksToPlaylist(playlistId, tracks = []) {
  const trackString = tracks.join(',');
  return fetch(
    `https://api.spotify.com/v1/users/z0ne66/playlists/${playlistId}/tracks?position=0&uris=${trackString}`,
    {
      ...spotifyRequestOptions,
      method: 'POST'
    }
  );
}

fetch('https://api.setlist.fm/rest/1.0/setlist/63e14e57', setlistRequestOptions)
  .then(data => data.json())
  .then(({ venue, artist, eventDate, url, sets: { set } }) => {
    const venueName = venue.name;
    const artistName = artist.name;
    const playlistName = `${artistName} - ${venueName}`;
    const playlistDescription = `${artistName} at ${venueName}. ${eventDate} ${url}`;
    const songsToSearchFor = set
      .reduce((trackList, innerSet) => trackList.concat(innerSet.song), [])
      .map(track => track.name)
      .map(trackName => searchSpotify(artistName, trackName));
    Promise.all(songsToSearchFor).then(searchResults =>
      Promise.all(searchResults.map(searchResult => searchResult.json())).then(
        parsedResults => {
          const trackURIs = parsedResults
            .map(({ tracks: { items } }) => {
              if (items && items.length > 0 && items[0].uri) {
                return items[0].uri;
              }
              return;
            })
            .filter(URIs => Boolean(URIs));
          createPlaylist(playlistName, playlistDescription)
            .then(data => data.json())
            .then(({ id }) => {
              addTracksToPlaylist(id, trackURIs).then(res => {
                console.log('Playlist Created');
              });
            });
        }
      )
    );
  })
  .catch(e => console.log(e));
