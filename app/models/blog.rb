class Blog < ApplicationRecord
	has_many :comments, dependent: :destroy
	enum status: { draft: 0, publish: 1 }
	extend FriendlyId
	friendly_id :title, use: :slugged

	validates_presence_of :title, :body

	belongs_to :topic
end
