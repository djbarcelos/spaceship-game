(function () {

    var cnv = document.querySelector('canvas'); // Canvas
    var ctx = cnv.getContext('2d');  // Contexto de render 2d

    // # Recursos do Jogo

    var sprites = [];
    var assetsToLoad = [];
    var missiles = [];
    var aliens = [];
    var messages = [];

    var alienFrequency = 100;
    var alienTimer = 0;
    var hits = 0;
    var FIRE = 0;
    var EXPLODED = 1;

    var background = new Sprite(identification, 0, 56, 400, 500, 0, 0);
    var defender = new Sprite(identification, 0, 0, 30, 50, 185, 450);

    sprites.push(background, defender);

    var startMessage = new ObjectsMessage(cnv.height / 2, 'Enter para iniciar', '#F00');

    var pauseMessage = new ObjectsMessage(cnv.height / 2, 'Jogo pausado', '#F00');
    pauseMessage.visible = false;

    var scoreMessage = new ObjectsMessage(10, `Acertos: 00${hits}`, '#0F0');
    scoreMessage.font = 'normal 10px emulogic';

    var gameOverMessage = new ObjectsMessage(cnv.height / 2, '', '#F00');
    gameOverMessage.visible = false;

    messages.push(startMessage, pauseMessage, scoreMessage, gameOverMessage);

    var img = new Image();
    img.addEventListener('load', loadHandler, false);
    img.src = 'img/img.png';
    assetsToLoad.push(img);

    var loadedAssets = 0;

    var LEFT = 37;
    var RIGTH = 39;
    var ENTER = 13;
    var SPACE = 32;

    var mvLeft = false;
    var mvRigth = false;
    var shoot = false;
    var spaceIsDown = false;

    var LOADING = 0;
    var PLAYING = 1;
    var PAUSED = 2;
    var OVER = 3;

    var gameState = LOADING;

    window.addEventListener('keydown', function (e) {
        var key = e.keyCode;
        switch (key) {
            case LEFT: mvLeft = true;
                break;
            case RIGTH: mvRigth = true;
                break;
            case SPACE:
                if (!spaceIsDown) {
                    spaceIsDown = true;
                    shoot = true;
                }
                break;
        }
    }, false);

    window.addEventListener('keyup', function (e) {
        var key = e.keyCode;
        switch (key) {
            case LEFT: mvLeft = false;
                break;
            case RIGTH: mvRigth = false;
                break;
            case ENTER:
                if (gameState === OVER)
                    return;
                if (gameState !== PLAYING) {
                    gameState = PLAYING;
                    startMessage.visible = false;
                    pauseMessage.visible = false;
                } else {
                    gameState = PAUSED;
                    pauseMessage.visible = true;
                }
                break;
            case SPACE:
                if (gameState !== PAUSED)
                    spaceIsDown = false;
                break;
        }
    }, false);

    // # Funcoes
    function loadHandler() {
        loadedAssets++;

        if (loadedAssets === assetsToLoad.length) {
            img.removeEventListener('load', loadHandler, false);
            gameState = PAUSED;
        }
    }

    function loop() {
        requestAnimationFrame(loop, cnv);

        switch (gameState) {
            case LOADING:
                break;
            case PLAYING: update();
                break;
            case OVER: endGame();
                break;
        }

        render();
    }

    function update() {

        // Move nave
        if (mvLeft && !mvRigth) { // Esquerda
            defender.vx = -5;
        }
        if (mvRigth && !mvLeft) { // Direita
            defender.vx = 5;
        }
        if (!mvLeft && !mvRigth) { // Parado
            defender.vx = 0;
        }

        // Cria Disparo
        if (shoot) {
            fireMissile();
            shoot = false;
        }

        defender.x = Math.max(0, Math.min(cnv.width - defender.width, defender.x + defender.vx));

        // Move Disparo
        missiles.forEach(missile => {
            missile.y += missile.vy;

            if (missile.y < -missile.height) {
                removeObjects(missile.id, missiles);
                removeObjects(missile.id, sprites);
            }
        });

        // ALIENS
        alienTimer++;

        if (alienTimer === alienFrequency) {
            makeAlien();
            alienTimer = 0;

            if (alienFrequency > 10) {
                alienFrequency--;
            } else {
                alienFrequency = 20
            }
        }

        // Move Alien
        aliens.forEach(alien => {

            if (alien.state !== alien.EXPLODED) {
                alien.y += alien.vy;

                if (alien.state === alien.CRAZY) {
                    if (alien.x > cnv.width - alien.width || alien.x < 0) {
                        alien.vx *= -1
                    }
                    alien.x += alien.vx;
                }
            }
            // verificar se  alien chegou a terra
            if (alien.y > cnv.height + alien.height) {
                gameState = OVER;
            }

            // Verificar se um alien colidi com a nave
            if (collide(alien, defender)) {
                destroyAlien(alien);
                removeObjects(defender, sprites);
                gameState = OVER;
            }

            // Verificar colisao dos alien ao missel
            missiles.forEach(missile => {
                if (collide(missile, alien) && alien.state !== alien.EXPLODED) {
                    updateScore();

                    destroyAlien(alien);

                    removeObjects(missile.id, missiles);
                    removeObjects(missile.id, sprites);
                }
            });
        });

    }

    function fireMissile() {
        var missile = new Sprite(identification, 136, 12, 8, 13, defender.centerX() - 4, defender.y - 13);
        missile.vy = -8;
        sprites.push(missile);
        missiles.push(missile);
        playSound(FIRE);
    }

    function makeAlien() {
        var alienPosition = (Math.floor(Math.random() * 8)) * 50;
        var alien = new Alien(identification, 30, 0, 50, 50, alienPosition, -50);
        alien.vy = 1;

        if (Math.floor(Math.random() * 11) > 7) {
            alien.state = alien.CRAZY;
            alien.vx = 2;
        }

        if (Math.floor(Math.random() * 11) > 5) {
            alien.vy = 2;
        }

        sprites.push(alien);
        aliens.push(alien);
    }

    function destroyAlien(alien) {
        alien.state = alien.EXPLODED;
        alien.explode();
        playSound(EXPLODED);
        setTimeout(() => {
            removeObjects(alien.id, aliens);
            removeObjects(alien.id, sprites);
        }, 300);
    }

    function removeObjects(objectToRemove, array) {

        var indice = array.findIndex(({ id }) => id === objectToRemove);
        if (indice !== -1) {
            array.splice(indice, 1);
        }
    }

    function updateScore() {
        hits++;

        if (hits < 100) {
            if (hits.toString().length < 2) {
                hits = '00' + hits;
            } else {
                hits = '0' + hits;
            }
        }

        scoreMessage.text = `Acertos: ${hits}`;
    }

    function endGame() {
        gameOverMessage.text = `A terra foi invadida`;
        gameOverMessage.visible = true;
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
    // Efeitos sonoros
    function playSound(soundType) {
        var sound = document.createElement("audio");
        if (soundType === EXPLODED) {
            sound.src = "/sound/explosion.mp3"
        } else {
            sound.src = "/sound/fire.mp3"
        }
        sound.addEventListener("canplaythrough", function () {
            sound.play();
        }, false);
    }

    function addControls() {

        if (!isMobile()) return;

        var container = document.getElementById('container');
        var controlArea = document.createElement("div");
        var centralAreaControl = document.createElement("div");
        var CTR_LEFT = document.createElement('button');
        var CTR_RIGHT = document.createElement('button');
        var CTR_START = document.createElement('button');
        var CTR_SHOOT = document.createElement('button');

        controlArea.className = 'control-area';
        centralAreaControl.className = 'central-area-control';

        CTR_LEFT.type = 'button';
        CTR_RIGHT.type = 'button';

        CTR_LEFT.innerHTML = '<';
        CTR_RIGHT.innerHTML = '>';
        CTR_START.innerHTML = 'START';
        CTR_SHOOT.innerHTML = 'ATIRAR';

        CTR_LEFT.className = 'direction-ctr';
        CTR_RIGHT.className = 'direction-ctr';
        CTR_START.className = 'start-ctr';
        CTR_SHOOT.className = 'shoot-ctr';

        CTR_LEFT.addEventListener('touchstart', function (evt) {
            mvLeft = true;
        }, false);

        CTR_LEFT.addEventListener('touchend', function (evt) {
            mvLeft = false;
        }, false);

        CTR_RIGHT.addEventListener('touchstart', function (evt) {
            mvRigth = true;
        }, false);

        CTR_RIGHT.addEventListener('touchend', function (evt) {
            mvRigth = false;
        }, false);

        CTR_SHOOT.addEventListener('touchstart', function (evt) {
            if (!spaceIsDown) {
                spaceIsDown = true;
                shoot = true;
            }
        }, false);
        
        CTR_SHOOT.addEventListener('touchend', function (evt) {
            if (gameState !== PAUSED)
                    spaceIsDown = false;
        }, false);

        CTR_START.addEventListener('touchend', function (evt) {
            if (gameState === OVER)
                return;
            if (gameState !== PLAYING) {
                gameState = PLAYING;
                startMessage.visible = false;
                pauseMessage.visible = false;
            } else {
                gameState = PAUSED;
                pauseMessage.visible = true;
            }
        }, false);

        controlArea.appendChild(CTR_LEFT);
        controlArea.appendChild(CTR_START);
        controlArea.appendChild(CTR_RIGHT);

        centralAreaControl.appendChild(CTR_SHOOT);

        container.appendChild(controlArea);
        container.appendChild(centralAreaControl);
    }

    function render() {
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        if (sprites.length) {
            sprites.forEach(spr => {
                ctx.drawImage(img, spr.sourceX, spr.sourceY, spr.width, spr.height, Math.floor(spr.x), Math.floor(spr.y), spr.width, spr.height);
            })
        }

        if (messages.length) {
            messages.forEach(msg => {
                if (msg.visible) {
                    ctx.font = msg.font;
                    ctx.fillStyle = msg.color;
                    ctx.textBaseline = msg.baseline;
                    msg.x = (cnv.width - ctx.measureText(msg.text).width) / 2;
                    ctx.fillText(msg.text, msg.x, msg.y);
                }
            });
        }
    }

    loop();
    addControls();
})();