var system = function(){
	"use strict";
	
	return {
		ajax:function(file,data){
			var url = system.getURL();
			url = url[0]+"/wp-content/plugins/timetracker/"+file;

			return $.ajax({
				url:url,
				data:{'data':data},
				type:"POST",
				async:false,
			});
		},
		templates:function(url){
			return $.ajax({
				url:url,
				type:"POST",
				async:false,
			});
		},
		loader:function(status){
			$(window).bind("load",function(){
				setTimeout(function(){
					if(status){
						$(".loader").addClass('animate-down');								
						$(".loader").removeClass('animate-up');		
					}
					else{
						$(".loader").addClass('animate-up');								
						$(".loader").removeClass('animate-down');								
					}
				},1000);
			});	
		},
		note:function(message,duration,handler){
			var notification = document.querySelector('.mdl-js-snackbar');
			var data = {
				message: message,
				timeout: duration,
			};
			notification.MaterialSnackbar.showSnackbar(data);
			handler();
		},
		delay:function(handler,delay){
			setTimeout(function(){
				handler();
			},delay);
		},
		getURL:function(){
			var data = localStorage.getItem("timetracker_url");
			return JSON.parse(data);
		},
		ini:function(){
			if (typeof module === 'object'){window.module = module; module = undefined;}
			if (window.module) module = window.module;
			window.$ = window.jQuery = require('jquery.min.js');
			$.getScript("material.min.js");
		}
	}
}();

var process = function(){
	"use strict";
	return {
		ini:function(){
			getURL.ini();
		},
		getFreq:function(){
			var data = system.ajax("getData.php?getFreq","");
			return data.responseText;
		}
	}
}();

var getURL = function(){
	"use strict";
	return {
		ini:function(){
			$(".display_content").addClass('hidden');
			$("#display_getUrl").removeClass('hidden');
			system.loader(true);
			var url = ((localStorage.getItem("timetracker_url") == null) || (localStorage.getItem("timetracker_url") == ""))?"null":localStorage.getItem("timetracker_url");
			if(url == 'null'){
				getURL.form();
			}
			else{
				url = JSON.parse(url);
				if((!url[1]) || (url[1] == false))
					getURL.form();
				else{
					login.ini();
				}
			}
		},
		form:function(){
			system.loader(false);
			$("#form_getUrl").validate({
				submitHandler:function(){
					$(this).attr({"disabled":"true"});
					var url = $("#input_url").val();
					var isChecked = $("#input_remember").is(":checked");
					var data = system.templates(url+'/wp-content/plugins/timetracker/test.html');
					if(data.responseText == "access granted"){
						system.note("Success",3000,function(){
							$("#btn_checkUrl").removeAttr("disabled");
							$(".loader").removeClass('animate-up');	

							localStorage.setItem("timetracker_url",JSON.stringify([url,isChecked]));
							system.delay(function(){login.ini();},1000);
						});
					}
					else{
						system.note("Failed to access the server.",3000,function(){
							$("#btn_checkUrl").removeAttr("disabled");
						});					
					}
				}
			});
		}
	};
}();

var login = function(){
	"use strict";

	return {
		ini:function(){
			system.loader(false);
			$(".loader").addClass('animate-up');	
			$(".display_content").addClass('hidden');
			$("#display_login").removeClass('hidden');
			login.form();

			var x = 0;
			$(".show_password").on('click',function(){
				x++;
				if((x%2)==0){
					$(".show_password").html("visibility");
					$("#input_password").attr({"type":"password"});
				}
				else{
					$(".show_password").html("visibility_off");
					$("#input_password").attr({"type":"text"});
				}
			});
		},
		form:function(){
			$("#form_login").validate({
				submitHandler:function(){
					$(this).attr({"disabled":"true"});
					var data = $("#form_login").serializeArray();
					data = system.ajax("login.php",data);

					if(data.responseText == 0){
						system.note("Login Failed",3000,function(){
							$("#btn_login").removeAttr("disabled");
						});
					}
					else{
						localStorage.setItem('userAccount',data.responseText);
						system.note("Success",3000,function(){
							$("#btn_login").removeAttr("disabled");
							$(".loader").removeClass('animate-up');	
							system.delay(function(){timer.ini();},1000);
						});
					}
				}
			});			
		}	
	}
}();

var timer = function(){
	"use strict";

	return {
		ini:function(){
			system.loader(false);
			$(".loader").addClass('animate-up');	
			$(".display_content").addClass('hidden');
			$("#display_timetracker").removeClass('hidden');

			var _this = this,flag = false;
			user.ini();
			screenCapture.ini();
			$("#input_startTimer").on("click",function(e){
				var data = $(e.target.checked);
				if(data[0]){
					$('label[for="input_startTimer"]').addClass('is-checked');
					if(flag == 0){
						flag = true;
						_this.start();
					}
					else{
						_this.resume();
					}
				}
				else{
					$('label[for="input_startTimer"]').removeClass('is-checked');
					_this.pause();
				}
			});
		},
		start:function(){
			var user = localStorage.getItem("userAccount");
			var user = JSON.parse(user);
			var freq = process.getFreq();

			$("#timer").timer({
				duration:freq,
				format: '%H:%M:%S',
				callback:function(){
					screenCapture.snap(user.ID);
				},
				repeat:true
			});
		},
		pause:function(){
			$("#timer").timer("pause");
		},
		resume:function(){
			$("#timer").timer("resume");
		}
	}
}();

var screenCapture = function(){
	"use sctrict";
	return {
		ini:function(){
			var id = user.getID();
			var screen = new Screen(id);
			screen.onaddstream = function(e) {
				$("header#screenCapture").html(e.video);
			    $("header#screenCapture video").attr({"onplaying":"this.controls=false"});
			    $("header#screenCapture video").attr({"id":"videoOutput"});
			};
			screen.check();
		    screen.share();
		    system.delay(function(){$(".loader").addClass('animate-up')},1000);
		},
		snap:function(user){
			var frame = captureVideoFrame('videoOutput','png');
			var data = system.ajax("saveData.php",[user,frame.dataUri]);	
		},
		leave:function(){
			var id = user.getID();
			var screen = new Screen(id);
			screen.check();
		    screen.share();
		    screen.leave();
		}
    }
}();

var user = function(){
	"use sctrict";
	return {
		ini:function(){
			var account = localStorage.getItem("userAccount");
			account = JSON.parse(account);
			$("#display_Name").html(account.display_name);
			$("#display_Position").html(account.user_email);

			user.controls();
		},
		getID:function(){
			var account = localStorage.getItem("userAccount");
			account = JSON.parse(account);
			return account.ID;
		},
		controls:function(){
			const remote = require('electron').remote;
			var window = remote.getCurrentWindow();
			$('ul[for="btn_menu"] li').on('click',function(){
				var data = $(this).data();
				if(data.cmd == 'logout'){
					screenCapture.leave();
					login.ini();
				}
				else if(data.cmd == 'forgetUrl'){
					// screenCapture.leave();
					localStorage.removeItem("timetracker_url");
					getURL.ini();
				}
				else if(data.cmd == 'minimize'){
					window.minimize();
				}			
				else if(data.cmd == 'exit'){
					screenCapture.leave();
					window.close();
				}
			});
		}
	}
}();