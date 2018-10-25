// recherche des images en 404

var startURL = '';
var links = []; // liste des URL à crawler
var crawlerLog = []; // liste des urls crawlées avec les résultats d'analyse

var casper = require('casper').create();
var fs = require('fs');

function getLinks() {
  var links = document.querySelectorAll('a');
  return Array.prototype.map.call(links, function(e) {
      return e.getAttribute('href');
  });
}

var args = casper.cli.args;
if(args[0] != null) startURL = args[0];
else {
  casper.echo('Aucun site défini au lancement.', 'ERROR');
}
casper.echo('Analyse de l\'URL ' + startURL);
links.push(startURL);
var domain = getDomain(startURL);
casper.echo('Domaine d\'analyse : ' + domain);

// suppr de l'ancien fichier de logs
var logFile = 'analyse/log.csv';
console.log('Fichier de log : ', logFile);
fs.write(logFile, 'URL;Titre;lien externes;Lien internes; mailto', 'w'); // intialise le fichier de logs


casper.start();
crawlUrl( startURL );


function crawlUrl(url) {
  casper.thenOpen( url, function(response) {
    this.echo('==> ' + url, "INFO_BAR");
    this.echo('(' + (crawlerLog.length +1) + '/' + links.length +')');
    this.echo('Status http : ' + response.status);
    this.echo('-- ' + this.getTitle());

    var log = {
      'url': url,
      'title': this.getTitle(),
    }
    var newLinks = this.evaluate(getLinks);
    log['nbLinks'] = newLinks.length;



    // analyse des liens
    var nbInterne = 0;
    var nbExterne = 0;
    var nbMails = 0;
    for(var i in newLinks) {
      var regDom = new RegExp( '(https?:\/\/)([a-zA-Z0-9-_\.]*)\/?', 'gi');
      var regexLienComplet = new RegExp( '^(https?:\/\/)', 'i');
      var regexLienRacine = new RegExp('^\/', 'i');
      var regexAncre = new RegExp('^#', 'i');

      var isLienComplet = regexLienComplet.test( newLinks[i]);
      var isLienRacine = regexLienRacine.test( newLinks[i]);
      var isAncre = regexAncre.test( newLinks[i]);

      // console.log('Lien trouvé : ' + newLinks[i]);
      if( !isLienComplet){
        var cleanURL = url;
        if(isLienRacine) {
          var result = regDom.exec( url );
          newLinks[i] = result[1] + result[2] + newLinks[i];
        } else {
          if(cleanURL.lastIndexOf("/") == cleanURL.length-1)
            newLinks[i] = cleanURL.substr(0, -1) + newLinks[i];
          else {
            newLinks[i] = cleanURL + newLinks[i];
          }
        }
      }
      // console.log('Lien calculé : ' + newLinks[i]);

      var isExterne = domain != getDomain( newLinks[i] );
      var isMail = newLinks[i].match(/^mailto:/i)
      if( isExterne || isMail || isAncre ) {
        // lien extern
        // this.echo('lien externe ignoré : ' + newLinks[i], "WARNING");
        if( isExterne ) nbExterne ++;
        if( isMail ) nbMails ++;

      } else {
        // lien interne
        // if( !isAnchor ) { // on ne veut pas des ancres
          nbInterne ++;
          addToCrawler(newLinks[i]);
        // }
      }
    }
    log['nbLinksExt'] = nbExterne;
    log['nbLinksInt'] = nbInterne;
    log['nbMails'] = nbMails;
    console.log(newLinks.length + ' liens trouvés : ' + nbInterne + ' interne(s) et ' + nbExterne + ' externe(s)');

    crawlerLog.push(log);
    var ligneCsv = '';
    for(var i in log) {
      ligneCsv += log[i] + ';';
    }
    fs.write(logFile, ligneCsv + "\n", 'a');
  });
}

function addToCrawler(newLink) {
  var isNew = true;
  for(var j in links) {
    if(links[j] == newLink) {
      isNew = false;
      break;
    }
  }
  if(isNew) {
    links.push(newLink); // ajout à la liste à crawler
    // console.log('--> Ajout de ' + newLink);
    crawlUrl( newLink );
  }
  // console.log(links);
}

function getDomain( url ) {
  var regDom = new RegExp( '(https?:\/\/)([a-zA-Z0-9-_\.]*)(\/*.*)?$', 'gi');
  var result = regDom.exec( url );
  // console.log('domaine de ' + url);
  // console.log(result);
  if(!result) return '';
  return result[2];
}

casper.on('run.complete', function() {
  this.echo('Fin du test', 'INFO');
  this.echo('Affichage résultats à faire ici');
});

casper.run(function() {
  casper.exit();
});
