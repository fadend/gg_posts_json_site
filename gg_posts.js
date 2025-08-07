class PostsDisplay {
  static async create(parentElem, urlParams) {
    const postsUrl = parentElem.dataset.jsonUrl || "posts.json";
    const response = await fetch(postsUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch posts JSON ${postsUrl}: ${response.status}`,
      );
    }
    const posts = await response.json();
    return new PostsDisplay(parentElem, posts, urlParams);
  }

  constructor(parentElem, posts, urlParams) {
    this.parentElem = parentElem;
    this.indexBaseUrl = location.href.replace(/#.*/, "").replace(/\?.*/, "");
    this.baseUrl = parentElem.dataset.baseUrl || undefined;
    if (this.baseUrl) {
      this.baseUrl = new URL(this.baseUrl, location.href).href;
      console.log("baseUrl", this.baseUrl);
    }
    this.posts = posts;
    this.urlParams = urlParams;
    this.perPage = parseInt(urlParams.get("posts_per_page") || 20);
    this.numPages = parseInt(Math.ceil(this.posts.length / this.perPage));
    // Since we want new stuff at the front, counting from the end yields stabler URLs.
    // 0 = last page, this.numPages - 1 = current first page.
    const defaultPagesFromEnd = Math.max(0, this.numPages - 1);
    this.pagesFromEnd = Math.min(
      defaultPagesFromEnd,
      parseInt(urlParams.get("posts_pages_from_end") || defaultPagesFromEnd),
    );
    this.displayPosts();
  }

  postToElem(post) {
    const path = new URL(post.output_file, this.baseUrl).href;
    const thumbnails = post.thumbnails
      .map((src, i) => {
        src = new URL(src, this.baseUrl).href;
        return `<a href="${path}#img-${i + 1}"><img src="${src}"></a>`;
      })
      .join("");
    const div = document.createElement("div");
    div.classList.add("post");
    div.innerHTML = `<b><a href="${path}">${post.title}</a></b> (<em>posted ${post.post_date}</em>)<br>${post.initial_text}<br>${thumbnails}`;
    return div;
  }

  getLinkElemForPage(page, optLabel) {
    const label = document.createElement("span");
    label.classList.add("page-link");
    label.appendChild(document.createTextNode(optLabel || page));
    let newPagesFromEnd = this.numPages - page;
    if (newPagesFromEnd === this.pagesFromEnd) {
      return label;
    }
    const a = document.createElement("a");
    a.appendChild(label);
    const params = new URLSearchParams(this.urlParams);
    params.set("posts_pages_from_end", newPagesFromEnd);
    a.href = this.indexBaseUrl + "?" + params.toString();
    return a;
  }

  getPaginationBar() {
    const div = document.createElement("div");
    div.classList.add("posts-pagination-bar");
    div.appendChild(document.createTextNode("Page: "));
    const currentPage = this.numPages - this.pagesFromEnd;
    if (currentPage > 1) {
      div.appendChild(this.getLinkElemForPage(currentPage - 1, "Prev"));
    }
    for (let page = 1; page <= this.numPages; page++) {
      div.appendChild(this.getLinkElemForPage(page));
    }
    if (currentPage < this.numPages) {
      div.appendChild(this.getLinkElemForPage(currentPage + 1, "Next"));
    }
    return div;
  }

  displayPosts() {
    this.parentElem.innerHTML = "";
    if (!this.numPages) {
      return;
    }
    const paginationBar = this.getPaginationBar();
    this.parentElem.appendChild(paginationBar);
    const lastIndex = this.posts.length - 1;
    const start = Math.max(
      0,
      lastIndex - this.perPage * (1 + this.pagesFromEnd),
    );
    const end = 1 + lastIndex - this.perPage * this.pagesFromEnd;
    this.posts.slice(start, end).forEach((post) => {
      this.parentElem.appendChild(this.postToElem(post));
    });
    this.parentElem.appendChild(paginationBar.cloneNode(true));
  }
}

(async function () {
  const displayArea = document.getElementById("gg-posts-display");
  if (displayArea) {
    await PostsDisplay.create(
      displayArea,
      new URLSearchParams(location.search),
    );
  }
})();
