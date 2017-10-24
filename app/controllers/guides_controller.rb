class GuidesController < ApplicationController
	def book
		@books = ['Fountainhead', 'Deep Work', 'Scar Tissue']
	end
end