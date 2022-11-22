$(document).ready(function() {
  $(".dropdown-menu-base").click(function() {
      $(this).find("ul").toggle();
  });

  $("#config-fields").hide();

  $("#create-new-policy").click(function() {
    $("#config-fields").show();
    $("#config-content").hide();
  });

  $(".edit-policy").click(function() {
    $("#config-fields").show();
    $("#config-content").hide();
  });

  $("#save-policy").click(function() {
    $("#config-fields").hide();
    $("#config-content").show();
  });

  $("#cancel-policy").click(function() {
    $("#config-fields").hide();
    $("#config-content").show();
  });

  var codeLoaded = false;
  
  $('a[href="#Editor"]').on('shown.bs.tab', function (e) {
    if (!codeLoaded) {
      $.ajax({
        url : "/static/data/PluginDemo.txt",
        dataType : "text",
        success : function(data) {
          codeLoaded = true;
          $("#javascript-editor").text(data);
          // $("#Editor").show();
          var editor = CodeMirror.fromTextArea(document.getElementById("javascript-editor"), {
            lineNumbers : true,
            mode : "javascript"
          });
          editor.setOption("mode", "javascript");
          editor.setSize("100%", 500);
          editor.scrollTo(0, 0);
        }
      });          
    }
  })
})
