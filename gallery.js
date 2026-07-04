// js/gallery.js

// 等页面加载完再跑js
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. 先把放东西的那个 div 找出来
    var gallery = document.querySelector(".gallery");

    // 2. 这是一个“模板”函数，用来造一个 project box
    // (把这个函数定义在里面，免得外面能访问到)
    function createProjectBox(project) {
        var box = document.createElement("div");
        box.className = "box";

        // 用 + 号来拼 HTML，比较“笨”
        var boxHTML = 
            '<img src="' + project.img + '" alt="' + project.title + '">' +
            '<div class="box-caption">' + project.title + '</div>';
        
        box.innerHTML = boxHTML;

        return box;
    }

    // 3. 去拿 'data/projects.json' 文件
    fetch("data/projects.json")
        .then(function(response) {
            // 检查一下网络是不是通的
            if (!response.ok) {
                // 如果文件没找到(404)或者服务器错了(500)
                throw new Error("Network response was not ok");
            }
            // 把拿到的东西转成json格式
            return response.json();
        })
        .then(function(projects) {
            // 终于拿到数据了, 'projects' 是一个数组

            // 用 for 循环来处理数组 (i=i+1 也很“初学者”)
            for (var i = 0; i < projects.length; i = i + 1) {
                
                // 把造好的 box 加到页面上
                var newBox = createProjectBox(projects[i]);
                gallery.appendChild(newBox);
            }
        })
        .catch(function(error) {
            // 如果 fetch 或者 .then 里面出了任何错，就会跑到这里
            console.error("载入 projects.json 失败：", error);
            
            // 在页面上显示一个错误提示
            gallery.innerHTML = "<p style='color:red;'>Failed to load gallery data.</p>";
        });
});