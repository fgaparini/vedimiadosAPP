var soundSpin = '';
var fortuneOptions = {
  min_spins: 15,
  max_spins: 26,
  duration: 2200,
  prices: [],
  onSpinBounce: function() {
  	soundSpin.play();
  }
};

var apiServer = 'http://destapados.info/cms/api/';

var facebookAppId = '697705140294721';
var uid = ''; // facebook user id
var fbUser = {}; // username
var userId = ''; // internal user id
var gameToken = ''; // session token

var questionData = {};

// game settings
var levelTimeDuration = 30;
var levelTimeLeft = levelTimeDuration;
var levelScore = 0;
var levelUpdateTime = true;
var levelTimer;
var levelStartTime;

// ------------------------
var onDeviceReady = function(){

	// inicializo plugin
	// facebookConnectPlugin.browserInit( facebookAppId);
	soundSpin = new window.Media('file:///android_asset/www/sounds/sound.ogg', null, function(err) { alert("Error al cargar audio: "+err);});

	// exit app with phone back button
    document.addEventListener("backbutton", function(e){
           navigator.app.exitApp();
    }, false);
}
document.addEventListener("deviceready", onDeviceReady, false);
// ------------------------


// RequestAnimationFrame Shim
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
// END RAF Shim


// common initialization method for all pages

var commonPageInit = function(){

	$('.toggle-menu').on({
		click: function( ev){
			ev.preventDefault();
			if( $('.menu').hasClass('open') ){
				$('.menu').slideUp();
				$('.menu').removeClass('open');
			}else{
				$('.menu').slideDown();
				$('.menu').addClass('open');
			}
		}
	});

	$('.open-in-browser').on({
		click: function( e){
			e.preventDefault();
			window.open( $(this).attr('href'), '_system');
		}
	});

	$('#logout').on({
		click: function(){
			facebookConnectPlugin.logout(function(){ $.mobile.changePage( "login.html", { transition: "flip"} );}, function(){ showError('Error al intentar salir'); });
		}
	})
}

var requireLogin = function(){
	facebookConnectPlugin.login( ['email'], loginOk, function(){showError('Error al intentar ingresar con Facebook')} );
}

var checkFBLoginStatus = function( response){
	// hide loading indicator
	$.mobile.loading('hide');
	if (response.status === 'connected') {
		loginOk();
	} else if (response.status === 'not_authorized') {
		requireLogin();
	} else {
		requireLogin();
	}
}

var apiCallError = function(){
	showError('Error al conectar al servidor');
}

var showError = function( message){
	$('#app-error-message').html(message);
	$('.app-error').show();
}

var loginOk = function(){

	// api call
	$.mobile.loading( 'show');

	facebookConnectPlugin.api( '/me', ['email'], function( response){ 

		// send basic user data
		$.ajax({
			dataType: 'json',
			data: { 'user_info': response, 't': ( new Date().getTime() )},
			url: apiServer + 'get_token',
			success: function(data){				
				if( data.error == 'none'){
					// global data about user
					uid = response.id;
					gameToken = data.token;
					fbUser = data.userInfo;
					userId = data.user_id;
					$.mobile.changePage( "ruleta.html", { transition: "flip"} );
				}else{
					apiCallError();
				}
			},
			complete: function(){ $.mobile.loading('hide');}
		});

	}, function(){$.mobile.loading('hide');showError('Error al obtener información del usuario');});

}


// page action handlers

var loginInit = function() {
	
	commonPageInit();

	// check inernal login status
	if( uid == ''){
		$('#facebook-login span').html('Ingresar con Facebook');
		// facebook login intent
		$('#facebook-login a').on({
			click: function(e){
				e.preventDefault();
				$(this).unbind('click');
				$('#facebook-login span').html('Aguarda un momento');
				$.mobile.loading('show');
				facebookConnectPlugin.getLoginStatus( checkFBLoginStatus, function(){ $.mobile.loading('hide'); showError('Error al intenar login con Facebook');});
			}
		});

	}else{
		$('#facebook-login span').html('Comenzar partida');
		// load Roullette and start new game
		$('#facebook-login a').on({
			click: function(e){
				e.preventDefault();
				$(this).unbind('click');
				$('#facebook-login span').html('Aguarda un momento');
				$.mobile.changePage( "ruleta.html", { transition: "flip"} );
			}
		});
	}
	
}

// roulette
var rouletteInit = function(){

	commonPageInit();

	fortuneOptions.prices = [];
	$('#username').text( 'A jugar ' + fbUser.first_name + '!');
	// data = [{id: 4, name: 'Subsidios'}, {id: 6, name: 'Presupuesto'},{id: 7, name: 'Otros'}, {id: 2, name: 'Educación'},{id: 5, name: 'Obras públicas'}, {id: 8, name: 'Vivienda'}, {id: 3, name: 'Sueldos y viáticos'}, {id: 1, name: 'Salud'} ];
	data = [{id: 5, name: 'Obra Pública'}, {id: 2, name: 'Educación'},{id: 7, name: 'Otros'}, { id: 6, name: 'Presupuesto'},{id: 4, name: 'Subsidios'}, {id: 1, name: 'Salud'}, {id: 3, name: 'Sueldos y Viáticos'}, {id: 8, name: 'Vivienda'} ];
	$.each( data, function( key, val){
		fortuneOptions.prices[key] = { id: val.id, name: val.name};
	});

	var $r = $('.roulette').fortune( fortuneOptions);

	$('.spinner').on('click', function(e) {
		e.preventDefault();
		$('.spinner').off('click');
		$('.spinner span').html('Espera');
		//var price = Math.floor((Math.random() * 8));
		$r.spin().done(function(price) {

			// show selected category and go to question
			$('#page-roulette .header-info .center').text(price.name);

			$.mobile.loading('show');
			// get question before show screen
			$.ajax({
				dataType: 'json',
				data: { 'token': gameToken, 'user_id': userId, 'category_id': price.id, 't': ( new Date().getTime() )},
				url: apiServer + 'get_question',
				success: function(data){				
					if( data.error == 'none'){
						// global data about user
						questionData = data;
						$.mobile.changePage( "pregunta.html", { transition: "flip"} );
					}else{
						apiCallError();
					}
				},
				complete: function(){ $.mobile.loading('hide');}
			});
	      
	    });

	});

}

// rouletteInit();

var helperQuestionInit = function(){
	$.ajax({
		dataType: 'json',
		data: { 'token': gameToken, 'user_id': userId, 'category_id': 1, 't': ( new Date().getTime() )},
		url: apiServer + 'get_question',
		success: function(data){				
			if( data.error == 'none'){
				// global data about user
				questionData = data;
				questionInit();
			}else{
				apiCallError();
			}
		},
		complete: function(){ $.mobile.loading('hide');}
	});
}


var UpdateTime = function() {
    var cTime = new Date().getTime();
    var diff = cTime - levelStartTime;
    var seconds = levelTimeLeft - Math.floor(diff / 1000);
    //show seconds
    timeAndScore( seconds);
    if( seconds <= 0){
    	$('#score').html('0');
    	gameEnd('timeout', 0);
    }
}


var timer = function( time, update, complete) {
    var start = new Date().getTime();
    var interval = setInterval(function() {
        var now = time-(new Date().getTime()-start);
        if( now <= 0) {
            clearInterval(interval);
            complete();
        }
        else update(Math.floor(now/1000));
    }, 100); // the smaller this number, the more accurate the timer will be
}

var timeAndScore = function( timeLeft){
	
	// calculate score in time relation
	$('#time').html('00:' + ('0'+ timeLeft).slice(-2) );
	if( timeLeft > 25){
		levelScore = 100;
	}else if( timeLeft > 20){
		levelScore = 80;
	}else if(timeLeft > 15){
		levelScore = 50;
	}else if(timeLeft > 10){
		levelScore = 20;
	}else if(timeLeft > 0){
		levelScore = 10;
	}
	$('#score').html( levelScore);
	
}

var gameEnd = function( event_from, answer_id){

	clearInterval( levelTimer);

	// send game data and get the result
	if( event_from == 'timeout'){
		levelScore=0;
	}
	if( event_from == 'answer' || ( event_from == 'timeout' && levelUpdateTime) ){

		$.mobile.loading('show');
		$.ajax({
			dataType: 'json',
			data: { 'token': gameToken, 'user_id': userId, 'question_id': questionData.question_id, 'answer_id': answer_id, 'score': levelScore, 'start_time': questionData.time_start, 't': ( new Date().getTime() ) },
			url: apiServer + 'get_score',
			success: function(data){				
				if( data.error == 'none'){
					
					// game options
					if( data.status == 'correct'){
						$('.paper-result span').addClass('ok').html('CORRECTO');
						$('.answers').animate({marginTop: 30}, 500);
						$('.paper-result').css('opacity',0).show().animate({opacity: 1}, 500);
					}else if( data.status == 'incorrect'){
						levelScore = 0; // si contesta mal es cero el score
						$('.paper-result span').addClass('ko').html('INCORRECTO');
						$('.answers').animate({marginTop: 30}, 500);
						$('.paper-result').css('opacity',0).show().animate({opacity: 1}, 500);
					}

					$('#points').html( levelScore);

					//alert('#answer-' + data.answer_id);
					answer_ok = $('#answer-' + data.answer_ok );
					answer_ok.addClass('ok');
					if( !answer_ok.hasClass('selected') ){
						$('.selected').addClass('ko');
					}
					
					// delay to display popup
					setTimeout( function(){$('#question-result').popup("open");}, 1800);

				}else{
					apiCallError();
				}
			},
			complete: function(){ $.mobile.loading('hide');}
		});	

		
	}
}

var questionInit = function() {
	
	commonPageInit();

	levelUpdateTime = true; //restaura variable importante

	$('.paper-result,.source').hide();
	// datos de la pregunta
	$('.last-paper h2').text( questionData.question);

	// respuestas
	a=1;
	for( i in questionData.answers){
		$('.answers ul').append('<li class="answer answer-' + a + '" id="answer-' + i + '"><a href="#" rel="'+i+'">' + questionData.answers[i] + '</a></li>')
		a++;
	}

	if( questionData.question_source != ''){
		$('.source').html('Fuente: <a href="#" class="open-in-browser" data-ajax="false" target="_blank" rel="external">' + questionData.question_source + '</a>').show();
	}

	$('.answers a').on({
		click: function( ev){
			ev.preventDefault();
			// select answer
			$(this).parent().addClass('selected');
			clearInterval( levelTimer);
			gameEnd('answer', $(this).attr('rel') );
		}
	});

	// load questions and options
	// timer( levelTimeDuration*1000, timeAndScore, function(){gameEnd('timeout', 0);});
	// reset timer
	clearInterval( levelTimer);
	levelStartTime = new Date().getTime();
	levelTimeLeft = levelTimeDuration;
	levelTimer = setInterval(UpdateTime, 500);

	/*$('.answers a').on({
		click: function( ev){	
			$.mobile.changePage( "ruleta.html", { transition: "flip"} );
		}
	});*/	
}

//helperQuestionInit();

// suggest
var suggestInit = function(){

	commonPageInit();

	$('#send-suggest').on({

		click: function( e){
			e.preventDefault();
			$.mobile.loading('show');
			$.ajax({
				dataType: 'json',
				data: {'token': gameToken, 'user_id': userId, 't': ( new Date().getTime() )},
				url: apiServer + 'user_suggest/' + $('#form-suggest').serialize(),
				success: function(data){				
					if( data.error == 'none'){
						// global data about user	
						if( data.validation_error == 'none'){					
							$('#suggest-result').popup("open");
						}else{

							$('#suggest-error-message').html( data.validation_message);
							$('#suggest-error').popup("open");
						}
					}else{
						apiCallError();
					}
				},
				complete: function(){ $.mobile.loading('hide');}
			});	

		}

	});

	// reset form
	$('#suggest-other').on({
		click: function(){
			$('.cleanme').val('');
			$('#suggest-result').popup("close");
		}
	})

}

//suggestInit();

var rankingInit = function(){

	commonPageInit();

	$.mobile.loading('show');
	$.ajax({
		dataType: 'json',
		data: {'token': gameToken, 'user_id': userId, 't': ( new Date().getTime() )},
		url: apiServer + 'get_ranking',
		success: function(data){				
			if( data.error == 'none'){
				// global data about user	
				$.each( data.rows, function( key, value){
					className = ( value.me )?'starred':'';
					$('.col1').append('<li class="'+className+'">' + value.pos + '</li>');
					$('.col2').append('<li class="'+className+'">' + value.name + '</li>');
					$('.col3').append('<li class="'+className+'">' + value.score + '</li>');
				});
			}else{
				apiCallError();
			}
		},
		complete: function(){ $.mobile.loading('hide');}
	});	

}

// rankingInit();

// Events inicialization

$(window).on( "mobileinit", function() {
	//$.mobile.ignoreContentEnabled = true;
	//console.log('test');
});

// $(document).on('swipe', function(){	//alert('muevete'); });

// login page
$( document ).delegate("#page-login", "pageinit", loginInit );

// about page
$( document ).delegate("#page-about", "pageinit", commonPageInit );

// fortune page
$( document ).delegate("#page-roulette", "pageinit", rouletteInit);

// question page
$( document ).delegate("#page-question", "pageinit", questionInit );

// ranking page
$( document ).delegate("#page-ranking", "pageinit", rankingInit );

// ranking page
$( document ).delegate("#page-suggest", "pageinit", suggestInit );