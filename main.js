// 依旧假设HTML里有 <p id="contact-feedback"></p> 

// 唯一在外面获取的可能就是这个按钮
var sendButton = document.getElementById('sendButton');

// 不检查按钮存不存在，直接用！
// (如果页面上没有 'sendButton'，这行会在控制台报错，这很“初学者”)
sendButton.onclick = function() {
  
  // -- 把所有获取元素的代码都塞到函数里面 --
  // (每次点击按钮都会重新获取一次，效率很低，但很“人类”)
  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var messageInput = document.getElementById('text');
  var feedback = document.getElementById('contact-feedback');

  // 这里将值取出来
  var name = nameInput.value;
  var email = emailInput.value;
  var message = messageInput.value;

  // 在这里进行一个一个地检查
  if (name == "") {
    feedback.innerHTML = "name is empty";
    feedback.style.color = "red";
  } 
  else if (email == "") {
    feedback.innerHTML = "email is empty";
    feedback.style.color = "red";
  } 
  else if (message == "") {
    feedback.innerHTML = "message is empty";
    feedback.style.color = "red";
  }
  // 检查 @
  else if (email.indexOf('@') == -1) {
    feedback.innerHTML = "email is invalid";
    feedback.style.color = "red";
  } 
  // 都通过了
  else {
    feedback.innerHTML = "Thank " + "you" + name + "!";
    feedback.style.color = "green";

    // 清空
    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";
  }
};





// var carousel=document.querySelector('#carousel')
// var items = carousel.children
// var prevBtn = document.querySelector('#prev')
// var nextBtn =document.querySelector('#next')
// var index=0
// nextBtn.addEventListener('click', function() {
//   items[index].className =''
//   if(index === items.length -1) {
//     index=-1
//   }
// index++
// items[index].className = 'active'
// })

// var timer = setInterval(function () {
//   console.log('间隔2s输出一次')
// }, 2000)

// setTimeout(function () {
//   clearInterval(timer)
// }, 6000)

// setInterval(function() {
//   items[index].className =''
//   if(index === items.length -1) {
//     index=-1
//   }
// index++
// items[index].className = 'active'
// }, 1500);

