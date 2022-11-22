$(document).ready(function() {
  $(".dropdown-menu-base").click(function() {
      $(this).find("ul").toggle();
  });

  $("#config-fields").hide();
  
  $("#config-start").hide();

  $("#create-new-policy").click(function() {
    $("#config-start").show();
    $("#config-content").hide();
  });

  $(".edit-policy").click(function() {
    $("#config-fields").show();
    $("#config-content").hide();
  });

  $("#save-policy").click(function() {
    var btn = $(this);
    btn.button('loading');
    setTimeout(function(){
       btn.button('reset');
      $("#config-fields").hide();
      $("#config-content").show();       
    }, 1500);    
  });

  $("#cancel-policy").click(function() {
    $("#config-fields").hide();
    $("#config-content").show();
  });
  
  $("#load-script-cancel").click(function() {
    $("#config-start").hide();
    $("#config-content").show();
  });
  
  $("#load-script-next").click(function() {
    $("#config-start").hide();
    $("#config-fields").show();
  });
  
  var loadScriptEditor = CodeMirror.fromTextArea(document.getElementById("load-script-editor"), {
    lineNumbers : true,
    mode : "javascript"
  });
  loadScriptEditor.setOption("mode", "javascript");
  loadScriptEditor.setSize("100%", 400);
  loadScriptEditor.scrollTo(0, 0);

  $("input:file").change(function (){    
      $.ajax({
        url : "/static/data/PolicyPackDemo.txt",
        dataType : "text",
        success : function(data) {
          loadScriptEditor.getDoc().setValue(data);          
          loadScriptEditor.scrollTo(0, 0);
        }
      });          
  });  
})
