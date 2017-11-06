class TopicsController < ApplicationController
	layout 'blogs'
  def index
  	@topics = Topic.all
  end

  def show
  	@topic = Topic.find(params[:id])

  	if logged_in?(:site_admin)
  		@blogs = @topic.blogs.recent.page(params[:page]).per(5)
  	else
  		@blogs = @topic.blogs.publish.recent.page(params[:page]).per(5)
    end
  end
end
