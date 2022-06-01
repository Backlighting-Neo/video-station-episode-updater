function search(query, season, episode) {
  return new Promise((resolve, reject) => {
    SYNO.API.Request({
      api: 'SYNO.VideoStation2.PluginSearch',
      method: 'start',
      version: 1,
      params: {
        type: 'tvshow_episode',
        query,
        prefer_lang: 'chs',
        season,
        episode,
      },
      callback: (t, e) => t ? resolve(e.id) : reject(e),
    });
  });
}

function querySearchResult(task_id) {
  return new Promise((resolve, reject) => {
    SYNO.API.Request({
      api: 'SYNO.VideoStation2.PluginSearch',
      method: 'list',
      version: 1,
      params: {
        offset: 0,
        limit: 500,
        task_id
      },
      callback: (t, e) => t ? resolve(e) : reject(e),
    });
  });
}

function stopPoll(task_id) {
  return new Promise((resolve, reject) => {
    SYNO.API.Request({
      api: 'SYNO.VideoStation2.PluginSearch',
      method: 'stop',
      version: 1,
      params: {
        task_id
      },
      callback: (t, e) => t ? resolve(e) : reject(e),
    });
  });
}

function setPoster(id, url) {
  return new Promise((resolve, reject) => {
    SYNO.API.Request({
      api: 'SYNO.VideoStation2.Poster',
      method: 'set',
      version: 1,
      params: {
        id,
        type: 'tvshow_episode',
        target: 'url',
        url
      },
      callback: (t, e) => t ? resolve(e) : reject(e),
    });
  });
}

function updateEpsiode({
  id, title, tvshow_original_available, tagline, season, episode, original_available, certificate, rating, genre, actor, writer, director, summary, extra
}) {
  return new Promise((resolve, reject) => {
    SYNO.API.Request({
      api: 'SYNO.VideoStation2.TVShowEpisode',
      method: 'edit',
      version: 1,
      params: {
        library_id: 0,
        target: 'video',
        id,
        title,
        tvshow_original_available,
        tagline,
        season,
        episode,
        original_available,
        certificate,
        rating,
        genre,
        actor,
        writer,
        director,
        metadata_locked: true,
        summary,
        extra
      },
      callback: (t, e) => t ? resolve(e) : reject(e),
    });
  });
}

function sleep(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

async function processEpisode(episodeEntity) {
  const { title, season, episode, id } = episodeEntity;
  
  const task_id = await search(title, season, episode)

  let result = null;
  while(true) {
    const res = await querySearchResult(task_id);
    if(res.status === 'updated') {
      await stopPoll(task_id);
      result = res.result.sort((a, b) => b.summary.length - a.summary.length)[0];
      break;
    }
    else {
      sleep(2000);
    }
  }

  await updateEpsiode({
    id,
    title,
    tvshow_original_available: result.tvshow_original_available,
    tagline: result.tag_line,
    season,
    episode,
    original_available: result.original_available,
    certificate: result.certificate,
    rating: Math.round(result.extra['com.synology.TheMovieDb'].rating.themoviedb_tv * 10),
    genre: result.genre,
    actor: result.actor,
    writer: result.writer,
    director: result.director,
    summary: result.summary,
    extra: JSON.stringify(result.extra)
  });
  await setPoster(id, result.extra['com.synology.TheMovieDb'].poster[0]);

  console.log(`${title} S${season}E${episode}: ${result.tag_line} 已更新`);
}

async function main(es) {
  for(let i = 0; i < es.length; i++) {
    const entity = es[i];
  
    await processEpisode({
      title: entity.title,
      season: entity.season,
      episode: entity.episode,
      id: entity.id
    });
  }
}