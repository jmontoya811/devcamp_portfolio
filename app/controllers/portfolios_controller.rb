class PortfoliosController < ApplicationController
	def index
		@portfolio_item = Portfolio.all
	end
	def new
		@portfolio_item = Portfolio.new
	end
end